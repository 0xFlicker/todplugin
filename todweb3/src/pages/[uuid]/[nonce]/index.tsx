import Connect from "@/components/Connect/Connect";
import ConnectVideo from "@/components/ConnectVideo/ConnectVideo";
import type { NextPage } from "next";
import Head from "next/head";
import { Provider } from "@/hooks/useWeb3";
import styles from "../../../styles/Home.module.css";
import { useState } from "react";

interface IProps {
  uuid: string;
  nonce: number;
}

const Home: NextPage<IProps> = ({ uuid, nonce }) => {
  const [isBlurred, setIsBlurred] = useState(false);
  return (
    <Provider uuid={uuid} nonce={nonce}>
      <div className={styles.container}>
        <Head>
          <title>{`${process.env.TITLE} Collab Connector`}</title>
          <meta
            name="description"
            content={`Verifies wallet addresses for ${process.env.TITLE}`}
          />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <main>
          <ConnectVideo blur={isBlurred} />
          <Connect onActiveUpdated={setIsBlurred} />
        </main>
      </div>
    </Provider>
  );
};

Home.getInitialProps = (context) => {
  const { query } = context;
  let uuid = "";
  let nonce = 0;
  if (Array.isArray(query.uuid) && query.uuid[0]) {
    uuid = query.uuid[0];
  } else if (typeof query.uuid === "string") {
    uuid = query.uuid;
  }

  let nonceString = "";
  if (Array.isArray(query.nonce) && query.nonce[0]) {
    nonceString = query.nonce[0];
  } else if (typeof query.nonce === "string") {
    nonceString = query.nonce;
  }
  nonce = parseInt(nonceString, 10);

  return { uuid, nonce };
};

export default Home;
