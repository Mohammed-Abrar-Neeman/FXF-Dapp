// import { cookieStorage, createStorage, http } from '@wagmi/core'
import { ConnectButton } from "@/components/ConnectButton";
import { ActionButtonList } from "@/components/ActionButtonList";
import TabInterface from "@/components/TabInterface";

export default function Home() {
  return (
    <div className={"pages"}>
      <ConnectButton />
      {/* <ActionButtonList /> */}
      <TabInterface />
    </div>
  );
}