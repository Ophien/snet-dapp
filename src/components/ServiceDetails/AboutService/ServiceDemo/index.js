import React, { Component } from "react";
import { withStyles } from "@material-ui/styles";
import { connect } from "react-redux";

import ProgressBar from "../../../common/ProgressBar";
import { useStyles } from "./styles";
import { serviceDetailsActions, loaderActions } from "../../../../Redux/actionCreators";
import PurchaseToggler from "./PurchaseToggler";
import { freeCalls, groupInfo } from "../../../../Redux/reducers/ServiceDetailsReducer";
import { LoaderContent } from "../../../../utility/constants/LoaderContent";
import AlertBox, { alertTypes } from "../../../common/AlertBox";
import Routes from "../../../../utility/constants/Routes";

const demoProgressStatus = {
  purchasing: 1,
  executingAIservice: 2,
  displayingResponse: 3,
};

class ServiceDemo extends Component {
  state = {
    progressText: ["Purchase", "Configure", "Results"],
    purchaseCompleted: false,
    isServiceExecutionComplete: false,
    alert: {},
  };

  componentDidMount = async () => {
    if (process.env.REACT_APP_SANDBOX) {
      return;
    }

    await this.fetchFreeCallsUsage();
    this.scrollToHash();
  };

  fetchFreeCallsUsage = () => {
    const { service, fetchMeteringData, email } = this.props;
    return fetchMeteringData({
      orgId: service.org_id,
      serviceId: service.service_id,
      username: email,
    });
  };

  scrollToHash = () => {
    if (this.props.history.location.hash === Routes.hash.SERVICE_DEMO) {
      window.scroll({
        top: 520,
        behavior: "smooth",
      });
    }
  };

  computeActiveSection = () => {
    const { purchaseCompleted, isServiceExecutionComplete } = this.state;
    const { purchasing, executingAIservice, displayingResponse } = demoProgressStatus;

    return purchaseCompleted ? (isServiceExecutionComplete ? displayingResponse : executingAIservice) : purchasing;
  };

  serviceRequestStartHandler = () => {
    this.setState({ alert: {} });
    this.props.startLoader();
  };

  serviceRequestCompleteHandler = () => {
    this.setState({ isServiceExecutionComplete: true });
    this.props.stopLoader();
  };

  handleResetAndRun = () => {
    this.setState({ purchaseCompleted: false, isServiceExecutionComplete: false, alert: {} });
    this.fetchFreeCallsUsage();
  };

  serviceRequestErrorHandler = error => {
    this.setState({
      isServiceExecutionComplete: false,
      alert: { type: alertTypes.ERROR, message: "Service Execution went wrong. Please try again" },
    });
    this.props.stopLoader();
  };

  handlePurchaseComplete = () => {
    this.setState({ purchaseCompleted: true });
  };

  handlePurchaseError = error => {
    this.setState({
      purchaseCompleted: false,
      alert: { type: alertTypes.ERROR, message: "Purchase could not be completed. Please try again" },
    });
    this.props.stopLoader();
  };

  render() {
    const {
      classes,
      service,
      freeCalls: { remaining: freeCallsRemaining, allowed: freeCallsAllowed },
      groupInfo,
      wallet,
    } = this.props;

    const { progressText, purchaseCompleted, isServiceExecutionComplete, alert } = this.state;

    const {
      handleResetAndRun,
      serviceRequestStartHandler,
      serviceRequestCompleteHandler,
      serviceRequestErrorHandler,
      handlePurchaseError,
    } = this;

    return (
      <div className={classes.demoExampleContainer}>
        <h4>Process</h4>
        <ProgressBar activeSection={this.computeActiveSection()} progressText={progressText} />
        <PurchaseToggler
          groupInfo={groupInfo}
          purchaseCompleted={purchaseCompleted}
          purchaseProps={{
            handleComplete: this.handlePurchaseComplete,
            freeCallsRemaining,
            freeCallsAllowed,
            wallet,
            handlePurchaseError,
            isServiceAvailable: Boolean(service.is_available),
          }}
          thirdPartyProps={{
            service_id: service.service_id,
            org_id: service.org_id,
            freeCallsRemaining,
            isServiceExecutionComplete,
            handleResetAndRun,
            serviceRequestStartHandler,
            serviceRequestCompleteHandler,
            serviceRequestErrorHandler,
          }}
        />
        <AlertBox type={alert.type} message={alert.message} />
      </div>
    );
  }
}

const mapStateToProps = state => ({
  freeCalls: freeCalls(state),
  groupInfo: groupInfo(state),
  email: state.userReducer.email,
  wallet: state.userReducer.wallet,
});

const mapDispatchToProps = (dispatch, ownProps) => ({
  startLoader: () =>
    dispatch(loaderActions.startAppLoader(LoaderContent.SERVICE_INVOKATION(ownProps.service.display_name))),
  stopLoader: () => dispatch(loaderActions.stopAppLoader),
  fetchMeteringData: args => dispatch(serviceDetailsActions.fetchMeteringData(args)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withStyles(useStyles)(ServiceDemo));
