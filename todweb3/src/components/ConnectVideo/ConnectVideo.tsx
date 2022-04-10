import { FC } from "react";
import cn from "classnames";
import styles from "./ConnectVideo.module.css";

interface IProps {
  blur?: boolean;
}
const ConnectVideo: FC<IProps> = ({ blur }) => {
  return (
    <video
      className={cn(styles.fullScreen, blur ? styles.blur : null)}
      src="/tod-bg.mp4"
      autoPlay
      loop
      muted
    />
  );
};

export default ConnectVideo;
