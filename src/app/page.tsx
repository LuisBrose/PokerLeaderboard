import { PokerLeaderboard } from "@/components/poker-leaderboard"

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Poker Leaderboard</h1>
      </div>
      <PokerLeaderboard />
    </div>
  )
}
