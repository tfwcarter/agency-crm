"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

export function RevenueByMonthChart({ data }: { data: { month: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#24242e" vertical={false} />
        <XAxis dataKey="month" stroke="#6b6b7d" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#6b6b7d" fontSize={12} tickLine={false} axisLine={false} width={48} />
        <Tooltip
          contentStyle={{ background: "#131318", border: "1px solid #24242e", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#f4f4f6" }}
          formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
        />
        <Bar dataKey="revenue" fill="#6d5ef8" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StageFunnelChart({ data }: { data: { name: string; count: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#24242e" horizontal={false} />
        <XAxis type="number" stroke="#6b6b7d" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" stroke="#6b6b7d" fontSize={12} tickLine={false} axisLine={false} width={100} />
        <Tooltip contentStyle={{ background: "#131318", border: "1px solid #24242e", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#f4f4f6" }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
