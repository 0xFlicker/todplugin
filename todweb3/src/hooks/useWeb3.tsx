import { ethers, providers } from "ethers";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  createContext,
  FC,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";

interface IState {
  provider?: providers.Web3Provider;
  accounts?: string[];
  isConnecting: boolean;
  isSigning: boolean;
  isConnected: boolean;
  isSigned: boolean;
  refusedConnection: boolean;
  refusedSign: boolean;
  signedPayload?: string;
}

interface IContext extends IState {
  connect: () => Promise<void>;
  uuid: string;
  nonce: number;
}

const initialState: IState = {
  isConnected: false,
  isSigned: false,
  refusedConnection: false,
  refusedSign: false,
  isConnecting: false,
  isSigning: false,
};

const slice = createSlice({
  name: "web3",
  initialState,
  reducers: {
    connect(state, action: PayloadAction<providers.Web3Provider>) {
      state.provider = action.payload;
    },
    setAccounts(state, action: PayloadAction<string[]>) {
      state.accounts = action.payload;
      if (state.accounts?.length) {
        state.isConnected = true;
      }
      state.isConnecting = false;
    },
    signedMessage(state, action: PayloadAction<string>) {
      if (action.payload) {
        state.signedPayload = action.payload;
        state.isSigned = true;
        state.refusedSign = false;
      }
      state.isSigning = false;
    },
    startConnect(state) {
      state.isConnecting = true;
      state.isConnected = false;
      state.signedPayload = undefined;
      state.isSigned = false;
    },
    startSign(state) {
      state.isSigning = true;
    },
    refusedConnection(state) {
      state.refusedConnection = true;
      state.isConnecting = false;
    },
    refusedSign(state) {
      state.refusedSign = true;
      state.isSigning = false;
    },
  },
});

const initialContext: IContext = {
  uuid: "",
  nonce: 0,
  ...initialState,
  connect: async () => {},
};

const Context = createContext<IContext>(initialContext);

function useWeb3Context(context: IContext) {
  const { uuid, nonce } = context;
  const [state, dispatch] = useReducer(slice.reducer, context);

  useEffect(() => {
    if (!window.ethereum?.request) {
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    dispatch(slice.actions.connect(provider));
  }, []);

  useEffect(() => {
    if (!state.provider) {
      return;
    }
    const handleAccountsChanged = (accounts: string[]) => {
      dispatch(slice.actions.setAccounts(accounts));
    };
    state.provider?.addListener("accountsChanged", handleAccountsChanged);
    return () => {
      state.provider?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [state.provider]);

  useEffect(() => {
    if (state.provider) {
      state.provider.listAccounts().then((accounts) => {
        dispatch(slice.actions.setAccounts(accounts));
      });
    }
  }, [state.provider]);

  const connect = useCallback(async () => {
    if (state.provider) {
      try {
        dispatch(slice.actions.startConnect());
        const accounts = await state.provider.send("eth_requestAccounts", []);
        dispatch(slice.actions.setAccounts(accounts));
        const signer = state.provider.getSigner(accounts[0]);
        try {
          dispatch(slice.actions.startSign());
          const message = `This message is used to sign player\n with uuid ${uuid} into minecraft\n\nSigning this message costs no gas\nand is used only to verify ownership\nof this address.\n\nNonce: ${nonce}`;
          const signature = await signer.signMessage(message);
          dispatch(slice.actions.signedMessage(signature));
        } catch (error) {
          dispatch(slice.actions.refusedSign());
        }
      } catch (error) {
        dispatch(slice.actions.refusedConnection());
      }
    }
  }, [state.provider, nonce, uuid]);

  return {
    ...state,
    uuid,
    nonce,
    connect,
  };
}

interface IProps {
  uuid: string;
  nonce: number;
}

const Provider: FC<IProps> = ({ uuid, nonce, children }) => {
  const context = useWeb3Context({ ...initialContext, uuid, nonce });

  return <Context.Provider value={context}>{children}</Context.Provider>;
};

export default function useWeb3() {
  return useContext(Context);
}
export { Provider };
