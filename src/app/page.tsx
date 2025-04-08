// import { cookieStorage, createStorage, http } from '@wagmi/core'
import { ConnectButton } from "@/components/ConnectButton";
import Dashboard from "@/components/Dashboard/Dashboard";

export default function Home() {
  return (
    <div className={"pages"}>
      <ConnectButton />
      <Dashboard />
    </div>
  );
}