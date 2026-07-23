"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { Input, Select, Button } from "@/components/ui/primitives";
import { US_CITIES, NICHES, cityLabel } from "@/lib/lead-finder-presets";

const CITY_OPTIONS = US_CITIES.map((c) => ({ value: cityLabel(c) }));
const NICHE_OPTIONS = NICHES.map((n) => ({ value: n.label }));

export function LeadFinderForm({
  initial,
}: {
  initial: { location: string; niche: string; radius: string; keywords: string; limit: string; phone: string };
}) {
  const router = useRouter();
  const [location, setLocation] = useState(initial.location);
  const [niche, setNiche] = useState(initial.niche);
  const [radius, setRadius] = useState(initial.radius || "8");
  const [keywords, setKeywords] = useState(initial.keywords);
  const [limit, setLimit] = useState(initial.limit || "40");
  const [phoneOnly, setPhoneOnly] = useState(initial.phone === "yes");
  const [submitting, setSubmitting] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!location.trim() || !niche.trim()) return;
    setSubmitting(true);
    const params = new URLSearchParams({
      location: location.trim(),
      niche: niche.trim(),
      radius,
      limit,
    });
    if (keywords.trim()) params.set("keywords", keywords.trim());
    if (phoneOnly) params.set("phone", "yes");
    router.push(`/dashboard/lead-finder?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-fg-muted">Location — pick a city or type your own</span>
        <Combobox
          value={location}
          onValueChange={setLocation}
          options={CITY_OPTIONS}
          placeholder="Minneapolis, MN"
          storageKey="leadfinder-custom-locations"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-fg-muted">Niche — pick or type your own</span>
        <Combobox
          value={niche}
          onValueChange={setNiche}
          options={NICHE_OPTIONS}
          placeholder="Plumber"
          storageKey="leadfinder-custom-niches"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-fg-muted">Radius (mi)</span>
        <Select value={radius} onChange={(e) => setRadius(e.target.value)}>
          <option value="3">3</option>
          <option value="5">5</option>
          <option value="8">8</option>
          <option value="15">15</option>
          <option value="25">25</option>
          <option value="40">40</option>
        </Select>
      </label>

      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-xs font-medium text-fg-muted">Extra keywords (optional)</span>
        <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="emergency, 24 hour, family owned" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-fg-muted">Max results</span>
        <Select value={limit} onChange={(e) => setLimit(e.target.value)}>
          <option value="20">20</option>
          <option value="40">40</option>
          <option value="60">60</option>
        </Select>
      </label>
      <div className="flex items-end">
        <Button type="submit" className="w-full" disabled={submitting || !location.trim() || !niche.trim()}>
          <Search size={15} /> {submitting ? "Searching…" : "Find businesses"}
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm text-fg-muted sm:col-span-4">
        <input type="checkbox" checked={phoneOnly} onChange={(e) => setPhoneOnly(e.target.checked)} className="accent-brand" />
        Only show businesses with a phone number (ready for call lists)
      </label>
    </form>
  );
}
