export type PlanType = "list_cyfrowy" | "list_drukowany" | "video_cyfrowe" | "video_premium";

export type PlanRecord = {
  type: PlanType;
  slug: string;
  price: string;
};

export const plans: PlanRecord[] = [
  {
    type: "list_cyfrowy",
    slug: "list-cyfrowy",
    price: "99 zł",
  },
  {
    type: "list_drukowany",
    slug: "list-drukowany",
    price: "179 zł",
  },
  {
    type: "video_cyfrowe",
    slug: "wideo-cyfrowe",
    price: "199 zł",
  },
  {
    type: "video_premium",
    slug: "wideo-premium",
    price: "299 zł",
  },
];

export function getBySlug(slug: string) {
  return plans.find((p) => p.slug === slug);
}

export function getByType(type: PlanType) {
  return plans.find((p) => p.type === type);
}
