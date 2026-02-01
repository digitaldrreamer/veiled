import { ChatInterface } from "@/components/chat-interface"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-black relative">
      {/* Navigation Link */}
      <div className="absolute top-4 right-4 z-50">
        <Link href="/use-cases">
          <Button variant="outline" className="bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700">
            View Use Cases Demo
          </Button>
        </Link>
      </div>
      <ChatInterface />
    </div>
  )
}
