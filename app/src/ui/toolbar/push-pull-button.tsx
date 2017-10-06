import * as React from 'react'
import { ToolbarButton } from './button'
import { ToolbarButtonStyle } from './button'
import { IAheadBehind } from '../../lib/app-state'
import { Dispatcher } from '../../lib/dispatcher'
import { Octicon, OcticonSymbol } from '../octicons'
import { Repository } from '../../models/repository'
import { TipState } from '../../models/tip'
import { RelativeTime } from '../relative-time'
import { Progress } from '../../lib/app-state'

interface IPushPullButtonProps {
  /**
   * The ahead/behind count for the current branch. If null, it indicates the
   * branch doesn't have an upstream.
   */
  readonly aheadBehind: IAheadBehind | null

  /** The name of the remote. */
  readonly remoteName: string | null

  /** Is a push/pull/update in progress? */
  readonly networkActionInProgress: boolean

  /** The date of the last fetch. */
  readonly lastFetched: Date | null

  /** Progress information associated with the current operation */
  readonly progress: Progress | null

  /** The global dispatcher, to invoke repository operations. */
  readonly dispatcher: Dispatcher

  /** The current repository */
  readonly repository: Repository

  /**
   * Indicate whether the current branch is valid, unborn or detached HEAD
   *
   * Used for setting the enabled/disabled and the description text.
   */
  readonly tipState: TipState
}

/**
 * A button which pushes, pulls, or updates depending on the state of the
 * repository.
 */
export class PushPullButton extends React.Component<IPushPullButtonProps, {}> {
  public render() {
    const progress = this.props.progress

    const title = progress ? progress.title : this.getTitle()

    const description = progress
      ? progress.description || 'Hang on…'
      : this.getDescription(this.props.tipState)

    const progressValue = progress ? progress.value : undefined

    const networkActive =
      this.props.networkActionInProgress || !!this.props.progress

    // if we have a remote associated with this repository, we should enable this branch
    // when the tip is valid (no detached HEAD, no unborn repository)
    //
    // otherwise we consider the repository unpublished, and they should be able to
    // open the publish dialog - we'll handle publishing the current branch afterwards
    // if it exists
    const validState = this.props.remoteName
      ? this.props.tipState === TipState.Valid
      : true

    const disabled = !validState || networkActive

    return (
      <ToolbarButton
        title={title}
        description={description}
        progressValue={progressValue}
        className="push-pull-button"
        icon={this.getIcon()}
        iconClassName={this.props.networkActionInProgress ? 'spin' : ''}
        style={ToolbarButtonStyle.Subtitle}
        onClick={this.performAction}
        tooltip={progress ? progress.description : undefined}
        disabled={disabled}
      >
        {this.renderAheadBehind()}
      </ToolbarButton>
    )
  }

  private renderAheadBehind() {
    if (!this.props.aheadBehind || this.props.progress) {
      return null
    }

    const { ahead, behind } = this.props.aheadBehind
    if (ahead === 0 && behind === 0) {
      return null
    }

    const content: JSX.Element[] = []
    if (ahead > 0) {
      content.push(
        <span key="ahead">
          {ahead}
          <Octicon symbol={OcticonSymbol.arrowSmallUp} />
        </span>
      )
    }

    if (behind > 0) {
      content.push(
        <span key="behind">
          {behind}
          <Octicon symbol={OcticonSymbol.arrowSmallDown} />
        </span>
      )
    }

    return <div className="ahead-behind">{content}</div>
  }

  private getTitle(): string {
    if (!this.props.remoteName) {
      return 'Publish repository'
    }
    if (!this.props.aheadBehind) {
      return 'Publish branch'
    }

    const { ahead, behind } = this.props.aheadBehind
    const actionName = (function() {
      if (behind > 0) {
        return 'Pull'
      }
      if (ahead > 0) {
        return 'Push'
      }
      return 'Fetch'
    })()

    return `${actionName} ${this.props.remoteName}`
  }

  private getIcon(): OcticonSymbol {
    if (this.props.networkActionInProgress) {
      return OcticonSymbol.sync
    }

    if (!this.props.remoteName) {
      return OcticonSymbol.cloudUpload
    }
    if (!this.props.aheadBehind) {
      return OcticonSymbol.cloudUpload
    }

    const { ahead, behind } = this.props.aheadBehind
    if (this.props.networkActionInProgress) {
      return OcticonSymbol.sync
    }
    if (behind > 0) {
      return OcticonSymbol.arrowDown
    }
    if (ahead > 0) {
      return OcticonSymbol.arrowUp
    }
    return OcticonSymbol.sync
  }

  private getDescription(tipState: TipState): JSX.Element | string {
    if (!this.props.remoteName) {
      return 'Publish this repository to GitHub'
    }

    if (tipState === TipState.Detached) {
      return 'Unable to publish detached HEAD'
    }

    if (tipState === TipState.Unborn) {
      return 'Unable to publish unborn repository'
    }

    if (!this.props.aheadBehind) {
      const isGitHub = !!this.props.repository.gitHubRepository
      return isGitHub
        ? 'Publish this branch to GitHub'
        : 'Publish this branch to the remote'
    }

    const lastFetched = this.props.lastFetched
    if (lastFetched) {
      return (
        <span>
          Last fetched <RelativeTime date={lastFetched} />
        </span>
      )
    } else {
      return 'Never fetched'
    }
  }

  private performAction = () => {
    if (!this.props.aheadBehind) {
      this.props.dispatcher.push(this.props.repository)
      return
    }

    const { ahead, behind } = this.props.aheadBehind
    if (behind > 0) {
      this.props.dispatcher.pull(this.props.repository)
    } else if (ahead > 0) {
      this.props.dispatcher.push(this.props.repository)
    } else {
      this.props.dispatcher.fetch(this.props.repository)
    }
  }
}
