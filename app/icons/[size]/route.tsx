import { renderIcon } from "@/lib/icon";

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size } = await ctx.params;
  const n = size === "512" ? 512 : 192;
  return renderIcon(n);
}
