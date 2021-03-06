import React from "react";

import ActiveSession from "./ActiveSession";
import ExpiredSession from "./ExpiredSession";
import { walletTypes } from "../../../../../Redux/actionCreators/UserActions";

const Purchase = ({
  handleComplete,
  freeCallsRemaining,
  freeCallsAllowed,
  wallet,
  groupInfo,
  handlePurchaseError,
  isServiceAvailable,
}) => {
  const isMetamaskAvailable = () => {
    return wallet.type === walletTypes.METAMASK;
  };

  if (freeCallsRemaining <= 0) {
    return (
      <ExpiredSession
        handleComplete={handleComplete}
        metamask={isMetamaskAvailable()}
        groupInfo={groupInfo}
        handlePurchaseError={handlePurchaseError}
        isServiceAvailable={isServiceAvailable}
      />
    );
  }
  return (
    <ActiveSession
      freeCallsRemaining={freeCallsRemaining}
      freeCallsAllowed={freeCallsAllowed}
      handleComplete={handleComplete}
      isServiceAvailable={isServiceAvailable}
    />
  );
};

export default Purchase;
