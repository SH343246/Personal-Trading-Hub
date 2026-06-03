import { useEffect, useState } from "react";
import { Card, Text, Stack, Anchor, Group, Skeleton, Divider } from "@mantine/core";

interface Article {
  title: string;
  publisher: string;
  url: string;
  time_ago: string;
}

export function NewsCard({ symbol }: { symbol: string }) {
  const [articles, setArticles] = useState<Article[] | null>(null);

  useEffect(() => {
    if (!symbol) return;
    setArticles(null);
    const base = import.meta.env?.VITE_API_URL ?? "http://localhost:8001";
    fetch(`${base}/api/news/${encodeURIComponent(symbol)}?limit=6`)
      .then((r) => r.json())
      .then((d) => setArticles(Array.isArray(d) ? d : []))
      .catch(() => setArticles([]));
  }, [symbol]);

  return (
    <Card radius="md" withBorder>
      <Text fw={600} fz="sm" mb="sm">News — {symbol}</Text>

      {/* Loading skeletons */}
      {articles === null && (
        <Stack gap="xs">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <Skeleton height={14} mb={4} radius="sm" />
              <Skeleton height={10} width="40%" radius="sm" />
              {i < 3 && <Divider my="xs" />}
            </div>
          ))}
        </Stack>
      )}

      {/* No articles */}
      {articles !== null && articles.length === 0 && (
        <Text c="dimmed" fz="sm">No recent news found.</Text>
      )}

      {/* Article list */}
      {articles !== null && articles.length > 0 && (
        <Stack gap={0}>
          {articles.map((a, i) => (
            <div key={i}>
              <Anchor
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                underline="never"
                style={{ display: "block" }}
              >
                <Text
                  fz="sm"
                  fw={500}
                  style={{ lineHeight: 1.4 }}
                  className="hover:text-blue-500 transition-colors"
                >
                  {a.title}
                </Text>
              </Anchor>
              <Group gap="xs" mt={3}>
                <Text c="dimmed" fz="xs">{a.publisher}</Text>
                <Text c="dimmed" fz="xs">·</Text>
                <Text c="dimmed" fz="xs">{a.time_ago}</Text>
              </Group>
              {i < articles.length - 1 && <Divider my="xs" />}
            </div>
          ))}
        </Stack>
      )}
    </Card>
  );
}
