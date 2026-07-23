"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { runAutomations } from "@/lib/automations";

function parseLineItems(formData: FormData) {
  const descriptions = formData.getAll("description[]") as string[];
  const quantities = formData.getAll("quantity[]") as string[];
  const unitPrices = formData.getAll("unitPrice[]") as string[];

  return descriptions
    .map((description, i) => ({
      description,
      quantity: Number(quantities[i]) || 1,
      unitPrice: Number(unitPrices[i]) || 0,
      order: i,
    }))
    .filter((item) => item.description.trim().length > 0);
}

async function nextInvoiceNumber(organizationId: string) {
  const count = await db.invoice.count({ where: { organizationId } });
  return `INV-${String(count + 1001)}`;
}

export async function createInvoiceAction(formData: FormData) {
  const session = await requireSession();
  const clientId = formData.get("clientId") as string;
  const type = (formData.get("type") as string) || "invoice";
  const isRecurring = formData.get("isRecurring") === "on";
  const recurringInterval = (formData.get("recurringInterval") as string) || null;
  const taxRate = Number(formData.get("taxRate")) || 0;
  const dueDate = formData.get("dueDate") as string;
  const notes = (formData.get("notes") as string) || null;

  const lineItems = parseLineItems(formData);
  const subtotal = lineItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const invoice = await db.invoice.create({
    data: {
      organizationId: session.user.organizationId,
      clientId,
      number: await nextInvoiceNumber(session.user.organizationId),
      type,
      isRecurring,
      recurringInterval: isRecurring ? recurringInterval : null,
      subtotal,
      tax,
      total,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes,
      lineItems: { create: lineItems },
    },
  });

  await db.activity.create({
    data: {
      organizationId: session.user.organizationId,
      type: "invoice_created",
      description: `${type === "invoice" ? "Invoice" : type === "quote" ? "Quote" : "Contract"} ${invoice.number} created`,
      clientId,
      userId: session.user.id,
    },
  });

  revalidatePath("/dashboard/invoices");
  redirect(`/dashboard/invoices/${invoice.id}`);
}

export async function updateInvoiceStatusAction(id: string, status: string) {
  const session = await requireSession();
  const invoice = await db.invoice.update({
    where: { id, organizationId: session.user.organizationId },
    data: { status, paidAt: status === "paid" ? new Date() : undefined },
  });

  if (status === "paid") {
    await db.activity.create({
      data: {
        organizationId: session.user.organizationId,
        type: "invoice_paid",
        description: `Invoice ${invoice.number} marked paid — ${invoice.total}`,
        clientId: invoice.clientId,
        userId: session.user.id,
      },
    });

    await runAutomations(session.user.organizationId, "invoice_paid", {
      clientId: invoice.clientId,
      entityName: invoice.number,
    });
  }

  revalidatePath(`/dashboard/invoices/${id}`);
  revalidatePath("/dashboard/invoices");
}

export async function signInvoiceAction(id: string, formData: FormData) {
  const signedByName = formData.get("signedByName") as string;
  if (!signedByName?.trim()) return;

  await db.invoice.update({
    where: { id },
    data: { signedByName, signedAt: new Date(), status: "sent" },
  });

  revalidatePath(`/dashboard/invoices/${id}`);
}
