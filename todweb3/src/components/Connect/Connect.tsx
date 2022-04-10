import { FC, useCallback, useEffect, useState } from "react";
import cn from "classnames";
import useWeb3 from "@/hooks/useWeb3";

import Informational from "../Informational/Informational";

import styles from "./Connect.module.css";

interface IProps {
  onActiveUpdated: (active: boolean) => void;
}
const Connect: FC<IProps> = ({ onActiveUpdated = () => {} }) => {
  const [isActive, setIsActive] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [isFailure, setIsFailure] = useState(false);
  const {
    connect,
    isConnecting,
    refusedConnection,
    refusedSign,
    isSigning,
    isSigned,
    accounts,
    signedPayload,
    uuid,
    nonce,
  } = useWeb3();
  useEffect(() => {
    if (!isConnecting && !isSigning) {
      onActiveUpdated(isActive);
    }
  }, [isConnecting, isSigning, onActiveUpdated, isActive]);
  useEffect(() => {
    if (refusedConnection || refusedSign) {
      setIsRejected(true);
      setIsSuccess(false);
    }
  }, [refusedConnection, refusedSign]);
  const onEnter = useCallback(() => setIsActive(true), [setIsActive]);
  const onLeave = useCallback(() => setIsActive(false), [setIsActive]);

  const onDone = useCallback(() => {
    setIsSuccess(false);
    setIsFailure(false);
    setIsRejected(false);
  }, []);

  useEffect(() => {
    if (accounts && isSigned && signedPayload) {
      const response = fetch("/api/player", {
        method: "POST",
        body: JSON.stringify({
          minecraftPlayerId: uuid,
          nonce,
          address: accounts[0],
          signature: signedPayload,
        }),
      });
      response
        .then(() => {
          setIsSuccess(true);
          setIsRejected(false);
          setIsFailure(false);
        })
        .catch(() => {
          setIsSuccess(false);
          setIsRejected(false);
          setIsFailure(true);
        });
    }
  }, [uuid, nonce, accounts, isSigned, signedPayload]);
  return (
    <>
      <a
        className={styles.connect}
        onClick={connect}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        Connect
        <i className={cn(styles.biRightArrow, styles.bi)} />
      </a>
      {isSuccess ? (
        <Informational onClose={onDone}>
          Successfully connected. You can close this window.
        </Informational>
      ) : undefined}
      {isRejected ? (
        <Informational onClose={onDone}>
          Rejected. Please try again....
        </Informational>
      ) : undefined}
      {isFailure ? (
        <Informational onClose={onDone}>
          Failed. Please try again or contact server admin
        </Informational>
      ) : undefined}
    </>
  );
};

export default Connect;
