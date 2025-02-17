import React, { Component } from 'react';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';
import {
  Classes,
  Callout,
  Intent,
  Dialog,
  MenuDivider,
  Button,
} from '@blueprintjs/core';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { endpoint } from 'app/api';
import { showResponseToast } from 'app/toast';
import {
  PasswordAuthLogin,
  PasswordAuthSignup,
} from 'components/auth/PasswordAuth';
import { RoleBlockedMessage } from 'components/common';
import {
  loginWithPassword as loginWithPasswordAction,
  loginWithToken as loginWithTokenAction,
} from 'actions/sessionActions';
import { selectMetadata } from 'selectors';

import './AuthenticationDialog.scss';

const messages = defineMessages({
  title: {
    id: 'signup.title',
    defaultMessage: 'Sign in',
  },
  registration_title: {
    id: 'signup.register',
    defaultMessage: 'Register',
  },
});

export class AuthenticationDialog extends Component {
  constructor(props) {
    super(props);

    this.initialState = {
      submitted: false,
      firstSection: '',
      secondSection: 'hide',
      userBlocked: false,
    };

    this.state = this.initialState;

    this.onLogin = this.onLogin.bind(this);
    this.onSignup = this.onSignup.bind(this);
    this.onRegisterClick = this.onRegisterClick.bind(this);
    this.onSignInClick = this.onSignInClick.bind(this);
    this.onOAuthLogin = this.onOAuthLogin.bind(this);
    this.resetState = this.resetState.bind(this);
  }

  onOAuthLogin() {
    const {
      nextPath,
      metadata: { auth },
    } = this.props;
    if (auth.oauth_uri) {
      const nextPathEnc = encodeURIComponent(nextPath || '/');
      window.location.replace(`/api/2/sessions/oauth?next=${nextPathEnc}`);
    }
  }

  onSignup(data) {
    const { intl } = this.props;
    endpoint
      .post('/roles/code', data)
      .then(() => {
        this.setState({ submitted: true });
      })
      .catch((e) => {
        showResponseToast(e.response, intl);
      });
  }

  async onLogin(data) {
    const { nextPath, intl, loginWithPassword } = this.props;
    try {
      await loginWithPassword(data.email, data.password);
      window.location.replace(nextPath || '/');
    } catch (error) {
      if (error.response.status === 403) {
        // User authenticated successfully but access is forbidden. This happens
        // when a user account has been blocked.
        this.setState({ userBlocked: true });
      } else {
        showResponseToast(error.response, intl);
      }
    }
  }

  onRegisterClick(e) {
    e.preventDefault();
    this.setState({
      firstSection: 'hide',
      secondSection: '',
      submitted: false,
    });
  }

  onSignInClick(e) {
    e.preventDefault();
    this.setState({
      firstSection: '',
      secondSection: 'hide',
      submitted: false,
    });
  }

  resetState() {
    this.setState(this.initialState);
  }

  render() {
    const { metadata, intl, isOpen, toggleDialog } = this.props;
    const { auth } = metadata;
    const { firstSection } = this.state;

    if (!isOpen) {
      return null;
    }

    if (!auth.password_login_uri) {
      this.onOAuthLogin();
      return null;
    }

    return (
      <Dialog
        className="AuthenticationScreen"
        isOpen={isOpen}
        onClose={toggleDialog}
        onOpening={this.resetState}
        title={
          firstSection === ''
            ? intl.formatMessage(messages.title)
            : intl.formatMessage(messages.registration_title)
        }
      >
        <div className={Classes.DIALOG_BODY}>{this.renderContent()}</div>
      </Dialog>
    );
  }

  renderContent() {
    const { userBlocked } = this.state;
    const { metadata } = this.props;
    const { auth } = metadata;

    if (userBlocked) {
      return this.renderBlockedMessage();
    }

    return (
      <>
        {this.renderFirstSection()}
        {this.renderSecondSection()}
        {auth.oauth_uri && this.renderOAuthButton()}
      </>
    );
  }

  renderBlockedMessage() {
    const { metadata } = this.props;
    const { message, link, link_label } = metadata.auth.role_blocked;

    return (
      <RoleBlockedMessage
        message={message}
        link={link}
        linkLabel={link_label}
      />
    );
  }

  renderFirstSection() {
    const { metadata } = this.props;
    const { auth } = metadata;
    const { firstSection } = this.state;
    const passwordLogin = auth.password_login_uri;

    return (
      <section className={firstSection}>
        {passwordLogin && (
          <PasswordAuthLogin
            buttonClassName="signin-button"
            onSubmit={this.onLogin}
          />
        )}
        {passwordLogin && (
          <div className="link-box">
            <a key="oauth" href="/" onClick={this.onRegisterClick}>
              <FormattedMessage
                id="signup.register.question"
                defaultMessage="Don't have account? Register!"
              />
            </a>
          </div>
        )}
      </section>
    );
  }

  renderSecondSection() {
    const { submitted, secondSection } = this.state;

    return (
      <section className={secondSection}>
        {submitted ? (
          <Callout
            intent={Intent.SUCCESS}
            icon="tick"
            title={
              <FormattedMessage
                id="signup.inbox.title"
                defaultMessage="Check your inbox"
              />
            }
          >
            <FormattedMessage
              id="signup.inbox.desc"
              defaultMessage="We've sent you an email, please follow the link to complete your registration"
            />
          </Callout>
        ) : (
          <span>
            <PasswordAuthSignup
              buttonClassName="signin-button"
              onSubmit={this.onSignup}
            />
          </span>
        )}
        <div className="link-box">
          <a key="oauth" href="/" onClick={this.onSignInClick}>
            <FormattedMessage
              id="signup.login"
              defaultMessage="Already have account? Sign in!"
            />
          </a>
        </div>
      </section>
    );
  }

  renderOAuthButton() {
    return (
      <>
        <MenuDivider className="menu-divider" />
        <Button icon="log-in" large fill onClick={this.onOAuthLogin}>
          <FormattedMessage
            id="login.oauth"
            defaultMessage="Sign in via OAuth"
          />
        </Button>
      </>
    );
  }
}
const mapStateToProps = (state) => ({ metadata: selectMetadata(state) });
const mapDispatchToProps = {
  loginWithToken: loginWithTokenAction,
  loginWithPassword: loginWithPasswordAction,
};
export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  injectIntl
)(AuthenticationDialog);
