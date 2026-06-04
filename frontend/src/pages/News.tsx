/**
 * News page
 * ---------
 * Shows news articles for each symbol in the user's watchlist.
 * Click a symbol chip to switch the feed.
 */

import { useEffect, useState } from "react";
import { Stack, Group, Text, Badge, Anchor, Skeleton, Card, Divider, TextInput, ActionIcon } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useWatchlist } from "../hooks/useWatchlist";
import { API } from "../config";

interface Article {
  title:     string;
  publisher: string;
  url:       string;
  time_ago:  string;
}

function NewsFeed({ symbol }: { symbol: string }) {
  const [articles, setArticles] = useState<Article[] | null>(null);

  useEffect(() => {
    setArticles(null);
    fetch(`${API}/news/${encodeURIComponent(symbol)}?limit=15`)
      .then((r) => r.json())
      .then((d) => setArticles(Array.isArray(d) ? d : []))
      .catch(() => setArticles([]));
  }, [symbol]);

  if (articles === null) {
    return (
      <Stack gap="lg">
        {[...Array(6)].map((_, i) => (
          <div key={i}>
            <Skeleton height={18} mb={6} radius="sm" />
            <Skeleton height={13} width="35%" radius="sm" />
            {i < 5 && <Divider mt="lg" />}
          </div>
        ))}
      </Stack>
    );
  }

  if (articles.length === 0) {
    return <Text c="dimmed" fz="sm" py="xl" ta="center">No recent news found for {symbol}.</Text>;
  }

  return (
    <Stack gap={0}>
      {articles.map((a, i) => (
        <div key={i}>
          <Anchor href={a.url} target="_blank" rel="noopener noreferrer" underline="never">
            <Text
              fz="md"
              fw={500}
              style={{ lineHeight: 1.5 }}
              className="hover:text-blue-500 transition-colors"
              mb={4}
            >
              {a.title}
            </Text>
          </Anchor>
          <Group gap="xs">
            <Text c="dimmed" fz="xs">{a.publisher}</Text>
            <Text c="dimmed" fz="xs">·</Text>
            <Text c="dimmed" fz="xs">{a.time_ago}</Text>
          </Group>
          {i < articles.length - 1 && <Divider my="lg" />}
        </div>
      ))}
    </Stack>
  );
}

export default function News() {
  const { symbols } = useWatchlist();
  const [selected, setSelected]   = useState<string>("");
  const [search,   setSearch]     = useState("");

  // Default to first watchlist symbol
  useEffect(() => {
    if (!selected && symbols.length > 0) setSelected(symbols[0]);
  }, [symbols, selected]);

  const filteredSymbols = symbols.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full px-4 lg:px-6 py-6">
      <Stack gap="md">

        <Text fw={700} fz={22}>News</Text>

        {/* Symbol selector */}
        <Card radius="md" withBorder>
          <Group justify="space-between" mb="sm">
            <Text fw={600} fz="sm">Filter by symbol</Text>
            <TextInput
              placeholder="Search…"
              size="xs"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              leftSection={<IconSearch size={12} />}
              style={{ width: 140 }}
            />
          </Group>
          <Group gap="xs">
            {filteredSymbols.map((sym) => (
              <Badge
                key={sym}
                size="lg"
                radius="md"
                variant={selected === sym ? "filled" : "light"}
                color={selected === sym ? "blue" : "gray"}
                onClick={() => setSelected(sym)}
                style={{ cursor: "pointer" }}
              >
                {sym}
              </Badge>
            ))}
            {filteredSymbols.length === 0 && (
              <Text c="dimmed" fz="sm">No symbols match.</Text>
            )}
          </Group>
        </Card>

        {/* News feed */}
        {selected ? (
          <Card radius="md" withBorder>
            <Text fw={600} fz={16} mb="lg">
              {selected}
              <Text span c="dimmed" fz="sm" fw={400}> — latest headlines</Text>
            </Text>
            <NewsFeed symbol={selected} />
          </Card>
        ) : (
          <Text c="dimmed" fz="sm" ta="center" py="xl">
            Add symbols to your watchlist to see news.
          </Text>
        )}

      </Stack>
    </div>
  );
}
