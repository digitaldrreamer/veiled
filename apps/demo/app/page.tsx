import { ChatInterface } from "@/components/chat-interface"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-black relative">
      <ChatInterface />
    </div>
  )
}
