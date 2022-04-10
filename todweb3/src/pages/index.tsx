import type { NextPage } from "next";
import Head from "next/head";
import styles from "../styles/Home.module.css";

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>{`${process.env.TITLE} Collab Connector`}</title>
        <meta
          name="description"
          content={`Verifies wallet addresses for ${process.env.TITLE}`}
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main></main>
    </div>
  );
};
export default Home;
