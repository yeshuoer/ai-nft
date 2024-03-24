import { ConnectButton } from "@rainbow-me/rainbowkit"

export default function Navigation() {
  return <div>
    <div className="flex items-center justify-between mx-40 pt-5">
      <h1 className="text-blue-600 text-3xl">AI NFT Generator</h1>
      <ConnectButton label="Connect" showBalance={false} />
    </div>
  </div>
}
