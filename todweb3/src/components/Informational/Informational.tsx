import { FC } from "react";
import styles from "./Informational.module.css";

interface IProps {
  onClose?: () => void;
}
const Informational: FC<IProps> = ({ onClose, children }) => {
  return (
    <div className={styles.modal}>
      <span className={styles.close} onClick={onClose}>
        X
      </span>
      <div className={styles.content}>{children}</div>
    </div>
  );
};

export default Informational;
