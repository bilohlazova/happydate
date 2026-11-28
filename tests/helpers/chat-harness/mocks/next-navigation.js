const router = { push: () => {}, refresh: () => {}, replace: () => {} };
const params = new URLSearchParams();
export const useRouter = () => router;
export const usePathname = () => "/";
export const useSearchParams = () => params;
