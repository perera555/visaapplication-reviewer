import { APPLY_MODE_INFO, getApplyMode, type VisaTypeId } from "@/lib/requirements";

export function ApplyModeBadge({ country, visaType, long = false }: { country: string; visaType?: VisaTypeId; long?: boolean }) {
  const info = APPLY_MODE_INFO[getApplyMode(country, visaType)];
  return (
    <span className={`chip ${info.className}`} title={info.detail}>
      {info.icon} {long ? info.label : info.short}
    </span>
  );
}
