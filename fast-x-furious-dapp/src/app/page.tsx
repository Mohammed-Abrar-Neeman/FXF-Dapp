// import { cookieStorage, createStorage, http } from '@wagmi/core'
import { ConnectButton } from "@/components/ConnectButton";
import { InfoList } from "@/components/InfoList";
import { ActionButtonList } from "@/components/ActionButtonList";
import ContractInteraction from "@/components/ContractInteraction";
import Image from 'next/image';

export default function Home() {

  return (
    <div className={"pages"}>

      <ConnectButton />
      <ActionButtonList />
      <ContractInteraction />
      {/* <InfoList /> */}
    </div>
  );
}