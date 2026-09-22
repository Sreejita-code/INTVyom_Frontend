import { useCallback, useEffect, useRef, useState } from "react";
import {
  callListAssistantsEndpoint,
  condenseListAssistantsResponse,
} from "@/services/assistant/assistantService";
import { AssistantItem } from "@/types/assistant";
import { useToast } from "@/hooks/use-toast";

const LIMIT = 15;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Paginated assistant list with infinite scroll. The name search runs on the backend, so it finds
 * assistants on pages that have not been loaded yet.
 *
 * Attach `lastElementRef` to the final rendered row — it observes that row and
 * pulls the next page when it scrolls into view. `refresh` resets to page 1,
 * which is what create/delete should call after a successful mutation.
 */
export function useAssistantList(signedIn: boolean) {
  const { toast } = useToast();

  const [assistants, setAssistants] = useState<AssistantItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [assistantName, setAssistantName] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const observer = useRef<IntersectionObserver | null>(null);
  const latestRequest = useRef(0);
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (listLoading || isLoadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [listLoading, isLoadingMore, hasMore],
  );

  const fetchList = useCallback(
    async (pageNum: number) => {
      if (!signedIn) {
        setListLoading(false);
        return;
      }

      if (pageNum === 1) setListLoading(true);
      else setIsLoadingMore(true);

      const requestId = ++latestRequest.current;
      const isStale = () => requestId !== latestRequest.current;

      try {
        const { ok, json } = await callListAssistantsEndpoint({
          page: pageNum,
          limit: LIMIT,
          ...(assistantName ? { assistantName } : {}),
        });
        if (isStale()) return;

        if (!ok) {
          const errMsg =
            (json as { error?: string; message?: string })?.error ||
            (json as { error?: string; message?: string })?.message ||
            "Failed to load assistants";
          toast({ variant: "destructive", title: "Error", description: errMsg });
          if (pageNum === 1) setAssistants([]);
          return;
        }

        const normalised: AssistantItem[] = condenseListAssistantsResponse(json);

        if (pageNum === 1) {
          setAssistants(normalised);
        } else {
          setAssistants((prev) => [...prev, ...normalised]);
        }

        setHasMore(normalised.length >= LIMIT);
      } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Failed to load assistants" });
      } finally {
        if (!isStale()) {
          setListLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [signedIn, assistantName, toast],
  );

  useEffect(() => {
    fetchList(page);
  }, [fetchList, page]);

  useEffect(() => {
    const id = setTimeout(() => {
      const next = searchQuery.trim();
      if (next === assistantName) return;
      setPage(1);
      setAssistantName(next);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchQuery, assistantName]);

  const refresh = useCallback(async () => {
    setPage(1);
    await fetchList(1);
  }, [fetchList]);

  return {
    filteredAssistants: assistants,
    listLoading,
    isLoadingMore,
    page,
    searchQuery,
    setSearchQuery,
    lastElementRef,
    refresh,
  };
}
