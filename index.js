import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Image, ImageBackground, Platform, StyleSheet, TouchableOpacity, View, ViewPropTypes, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video'; // eslint-disable-line

const BackgroundImage = ImageBackground || Image; // fall back to Image if RN < 0.46

const styles = StyleSheet.create({
  preloadingPlaceholder: {
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playArrow: {
    color: 'white',
  },
  video: Platform.Version >= 24 ? {} : {
    backgroundColor: 'black',
  },
  controls: {
    backgroundColor: 'rgba(0, 0, 0, 0.0)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playControl: {
    color: 'white',
    padding: 8,
  },
  extraControl: {
    color: 'white',
    padding: 8,
  },
  muteButton: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.6)'
  },
  durationButton: {
    position: 'absolute',
    right: 10,
    bottom: 15,
    borderRadius: 25,
    backgroundColor: '#000'
  },
  durationText: {
    color: 'white',
    padding: 8,
    fontSize: 14,
  },
  seekBar: {
    alignItems: 'center',
    height: 30,
    flexGrow: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginLeft: -10,
    marginRight: -5,
  },
  seekBarFullWidth: {
    marginLeft: 0,
    marginRight: 0,
    paddingHorizontal: 0,
    marginTop: -3,
    height: 3,
  },
  seekBarProgress: {
    height: 3,
    backgroundColor: '#F00',
  },
  seekBarKnob: {
    width: 20,
    height: 20,
    marginHorizontal: -8,
    marginVertical: -10,
    borderRadius: 10,
    backgroundColor: '#F00',
    transform: [{ scale: 0.8 }],
    zIndex: 1,
  },
  seekBarBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    height: 3,
  },
  overlayButton: {
    flex: 1,
  },
});

export default class VideoPlayer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isStarted: props.autoplay,
      isPlaying: props.autoplay,
      hasEnded: false,
      width: 200,
      progress: 0,
      isMuted: props.defaultMuted,
      isControlsVisible: !props.hideControlsOnStart,
      duration: 0,
      currentTime: null,
      isSeeking: false,
      wasPaused: props.paused,
    };

    this.seekBarWidth = 200;
    this.wasPlayingBeforeSeek = props.autoplay;
    this.seekTouchStart = 0;
    this.seekProgressStart = 0;

    this.onLayout = this.onLayout.bind(this);
    this.onStartPress = this.onStartPress.bind(this);
    this.onEnd = this.onEnd.bind(this);
    this.onLoad = this.onLoad.bind(this);
    this.onPlayPress = this.onPlayPress.bind(this);
    this.onMutePress = this.onMutePress.bind(this);
    this.showControls = this.showControls.bind(this);
    this.onToggleFullScreen = this.onToggleFullScreen.bind(this);
    this.onSeekBarLayout = this.onSeekBarLayout.bind(this);
    this.onSeekGrant = this.onSeekGrant.bind(this);
    this.onSeekRelease = this.onSeekRelease.bind(this);
    this.onSeek = this.onSeek.bind(this);
  }

  componentDidMount() {
    if (this.props.autoplay) {
      this.hideControls();
    }
  }

  componentDidUpdate() {
    if(this.state.wasPaused != this.props.paused) {
      this.setState({ wasPaused: this.props.paused})
      this.showControls();
    }
  }

  componentWillUnmount() {
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
      this.controlsTimeout = null;
    }
  }

  onLayout(event) {
    const { width } = event.nativeEvent.layout;
    this.setState({
      width,
    });
  }

  onStartPress() {
    if (this.props.onStart) {
      this.props.onStart();
    }

    this.setState(state => ({
      isPlaying: true,
      isStarted: true,
      hasEnded: false,
      progress: state.progress === 1 ? 0 : state.progress,
    }));

    this.hideControls();
  }

  onProgress(event) {

    if (this.state.isSeeking) {
      return;
    }

    if (this.props.onProgress) {
      this.props.onProgress(event);
    }

    this.setState({
      progress: event.currentTime / (this.props.duration || this.state.duration),
      currentTime: event.currentTime,
    });
  }

  onEnd(event) {
    if (this.props.onEnd) {
      this.props.onEnd(event);
    }

    if (this.props.endWithThumbnail || this.props.endThumbnail) {
      this.setState({ isStarted: false, hasEnded: true });
      this.player.dismissFullscreenPlayer();
    }

    this.setState({ progress: 1 });

    if (!this.props.loop) {
      this.setState(
        { isPlaying: false },
        () => this.player && this.player.seek(0)
      );
    } else {
      this.player.seek(0);
    }
  }

  onLoad(event) {
    if (this.props.onLoad) {
      this.props.onLoad(event);
    }

    const { duration } = event;
    this.setState({ currentTime: 0,  duration: duration });
  }

  onPlayPress() {
    if (this.props.onPlayPress) {
      this.props.onPlayPress();
    }

    this.setState({
      isPlaying: !this.state.isPlaying,
    });
    this.showControls();
  }

  onMutePress() {
    const isMuted = !this.state.isMuted;
    if (this.props.onMutePress) {
      this.props.onMutePress(isMuted);
    }
    this.setState({
      isMuted,
    });
    this.showControls();
  }

  onToggleFullScreen() {
    this.player.presentFullscreenPlayer();
  }

  onSeekBarLayout({ nativeEvent }) {
    const customStyle = this.props.customStyles.seekBar;
    let padding = 0;
    if (customStyle && customStyle.paddingHorizontal) {
      padding = customStyle.paddingHorizontal * 2;
    } else if (customStyle) {
      padding = customStyle.paddingLeft || 0;
      padding += customStyle.paddingRight ? customStyle.paddingRight : 0;
    } else {
      padding = 20;
    }

    this.seekBarWidth = nativeEvent.layout.width - padding;
  }

  onSeekStartResponder() {
    return true;
  }

  onSeekMoveResponder() {
    return true;
  }

  onSeekGrant(e) {
    this.seekTouchStart = e.nativeEvent.pageX;
    this.seekProgressStart = this.state.progress;
    this.wasPlayingBeforeSeek = this.state.isPlaying;
    this.setState({
      isSeeking: true,
      isPlaying: false,
    });
  }

  onSeekRelease() {
    this.setState({
      isSeeking: false,
      isPlaying: this.wasPlayingBeforeSeek,
    });
    this.showControls();
  }

  onSeek(e) {
    const diff = e.nativeEvent.pageX - this.seekTouchStart;
    const ratio = 100 / this.seekBarWidth;
    const progress = this.seekProgressStart + ((ratio * diff) / 100);

    this.setState({
      progress,
    });

    this.player.seek(progress * this.state.duration);
  }

  getSizeStyles() {
    const { videoWidth, videoHeight } = this.props;
    const { width } = this.state;
    const ratio = videoHeight / videoWidth;
    return {
      height: width * ratio,
      width,
    };
  }

  hideControls() {
    if (this.props.onHideControls) {
      this.props.onHideControls();
    }

    if (this.props.disableControlsAutoHide) {
      return;
    }

    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
      this.controlsTimeout = null;
    }
    this.controlsTimeout = setTimeout(() => {
      this.setState({ isControlsVisible: false });
    }, this.props.controlsTimeout);
  }


  secondsToMinutes(time) {
    var seconds=0, minutes=0, hours=0;
    var ss, sm, sh;

    hours = Math.floor(time / 3600);
    minutes = Math.floor((time - (hours * 3600))/60);
    seconds = Math.floor(time - (hours * 3600) - (minutes * 60))

    sh = hours != 0 ? hours.toString() + ':' : '';
    sm = minutes.toString().length == 1 ? ('0' + minutes.toString()) : minutes.toString();
    ss = seconds.toString().length == 1 ? ('0' + seconds.toString()) : seconds.toString();

    return sh + sm + ':' + ss;
  }

  showControls() {
    if (this.props.onShowControls) {
      this.props.onShowControls();
    }

    this.setState({
      isControlsVisible: true,
    });
    this.hideControls();
  }

  seek(t) {
    this.player.seek(t);
  }

  stop() {
    this.setState({
      isPlaying: false,
      progress: 0,
    });
    this.seek(0);
    this.showControls();
  }

  pause() {
    this.setState({
      isPlaying: false,
    });
    this.showControls();
  }

  resume() {
    this.setState({
      isPlaying: true,
    });
    this.showControls();
  }

  renderStartButton() {
    const { customStyles } = this.props;
    return (
      <TouchableOpacity
        style={[styles.playButton, customStyles.playButton]}
        onPress={() => {if(this.state.isPlaying) {this.onPlayPress()} else {this.onStartPress()}}}>
        <Icon style={[styles.playArrow, customStyles.playArrow]} name={!this.state.isPlaying ? "play-arrow" : "pause"} size={42} />
      </TouchableOpacity>
    );
  }

  renderThumbnail(thumbnail) {
    const { style, customStyles, ...props } = this.props;
    return (
      <BackgroundImage
        {...props}
        style={[
          styles.thumbnail,
          this.getSizeStyles(),
          style,
          customStyles.thumbnail,
        ]}
        source={thumbnail}>
      { this.props.topicControl ? this.renderStartButton()  : this.renderControls()}
      </BackgroundImage>
    );
  }

  renderSeekBar(fullWidth) {
    const { customStyles, disableSeek, repeat } = this.props;
    return (
      <View
        style={[
          styles.seekBar,
          fullWidth ? styles.seekBarFullWidth : {},
          customStyles.seekBar,
          fullWidth ? customStyles.seekBarFullWidth : {},
        ]}
        onLayout={this.onSeekBarLayout}
      >
        <View
          style={[
            { flexGrow: this.state.progress },
            styles.seekBarProgress,
            customStyles.seekBarProgress,
          ]}
        />
        { !fullWidth && !disableSeek ? (
          <View
            style={[
              styles.seekBarKnob,
              customStyles.seekBarKnob,
              this.state.isSeeking ? { transform: [{ scale: 1 }] } : {},
              this.state.isSeeking ? customStyles.seekBarKnobSeeking : {},
            ]}
            hitSlop={{ top: 20, bottom: 20, left: 10, right: 20 }}
            onStartShouldSetResponder={this.onSeekStartResponder}
            onMoveShouldSetPanResponder={this.onSeekMoveResponder}
            onResponderGrant={this.onSeekGrant}
            onResponderMove={this.onSeek}
            onResponderRelease={this.onSeekRelease}
            onResponderTerminate={this.onSeekRelease}
          />
        ) : null }
        <View style={[
          styles.seekBarBackground,
          { flexGrow: 1 - this.state.progress },
          customStyles.seekBarBackground,
        ]} />
      </View>
    );
  }

  renderControls() {
    const { customStyles } = this.props;
    return (
      <View style={[styles.controls, customStyles.controls, {position: 'absolute', height: this.props.videoHeight, width: this.props.videoWidth}]}>
        {this.state.duration && this.state.currentTime ?
          (<View style={styles.durationButton}>
            <Text style={styles.durationText}>{this.secondsToMinutes(this.state.duration - this.state.currentTime)}</Text>
          </View>)
          : null }
        {!this.props.autoplay ? this.renderStartButton() : null}
        {this.props.muted ? null : (
          <TouchableOpacity onPress={() => this.onMutePress()} style={[styles.muteButton, customStyles.muteButton]}>
            <Icon style={[styles.extraControl, customStyles.controlIcon]}
                  name={this.state.isMuted ? 'volume-off' : 'volume-up'}
                  size={21}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  renderVideo() {
    const {
      video,
      style,
      resizeMode,
      pauseOnPress,
      loop,
      fullScreenOnLongPress,
      customStyles,
      ...props
    } = this.props;

    return (
      <View style={customStyles.videoWrapper}>
        <Video
          {...props}
          style={[
            styles.video,
            this.getSizeStyles(),
            style,
            customStyles.video,
          ]}
          ref={p => { this.player = p; }}
          muted={this.props.muted || this.state.isMuted}
          paused={this.props.paused
            ? this.props.paused || !this.state.isPlaying
            : !this.state.isPlaying}
          onProgress={event => this.onProgress(event)}
          onEnd={this.onEnd}
          repeat={loop}
          onLoad={this.onLoad}
          source={video}
          resizeMode={resizeMode}
        />
        <View
          style={[
            this.getSizeStyles(),
            { marginTop: -this.getSizeStyles().height },
          ]}
        >
          <TouchableOpacity
            style={styles.overlayButton}
            onPress={() => {
              this.showControls();
              if (pauseOnPress)
                this.onPlayPress();
            }}

            onLongPress={() => {
              if (fullScreenOnLongPress && Platform.OS !== 'android')
                this.onToggleFullScreen();
            }}
          />
        </View>
        {((!this.state.isPlaying) || this.state.isControlsVisible)
          ? this.renderControls() : this.renderSeekBar(true)}
      </View>
    );
  }

  renderContent() {
    const { thumbnail, endThumbnail, style } = this.props;
    const { isStarted, hasEnded } = this.state;

    if (hasEnded && endThumbnail) {
      return this.renderThumbnail(endThumbnail);
    } else if (!isStarted && thumbnail) {
      return this.renderThumbnail(thumbnail);
    } else if (!isStarted) {
      return (
        <View style={[styles.preloadingPlaceholder, this.getSizeStyles(), style]}>
          {this.renderStartButton()}
        </View>
      );
    }
    return this.renderVideo();
  }

  render() {
    const {paused, thumbnail, style, customStyles, ...props} = this.props;

    return (
      <View onLayout={this.onLayout} style={this.props.customStyles.wrapper}>
        <View style={{position: 'absolute'}}>
            <BackgroundImage
              {...props}
              style={[
                styles.thumbnail,
                this.getSizeStyles(),
                style,
                customStyles.thumbnail,
              ]}
              source={thumbnail}>
            </BackgroundImage>
        </View>
        {this.renderContent()}
      </View>
    );
  }
}

VideoPlayer.propTypes = {
  video: Video.propTypes.source,
  thumbnail: Image.propTypes.source,
  endThumbnail: Image.propTypes.source,
  videoWidth: PropTypes.number,
  videoHeight: PropTypes.number,
  duration: PropTypes.number,
  autoplay: PropTypes.bool,
  paused: PropTypes.bool,
  defaultMuted: PropTypes.bool,
  muted: PropTypes.bool,
  style: ViewPropTypes.style,
  controlsTimeout: PropTypes.number,
  disableControlsAutoHide: PropTypes.bool,
  disableFullscreen: PropTypes.bool,
  loop: PropTypes.bool,
  resizeMode: Video.propTypes.resizeMode,
  hideControlsOnStart: PropTypes.bool,
  endWithThumbnail: PropTypes.bool,
  disableSeek: PropTypes.bool,
  pauseOnPress: PropTypes.bool,
  fullScreenOnLongPress: PropTypes.bool,
  customStyles: PropTypes.shape({
    wrapper: ViewPropTypes.style,
    video: Video.propTypes.style,
    videoWrapper: ViewPropTypes.style,
    controls: ViewPropTypes.style,
    playControl: TouchableOpacity.propTypes.style,
    controlButton: TouchableOpacity.propTypes.style,
    controlIcon: Icon.propTypes.style,
    playIcon: Icon.propTypes.style,
    seekBar: ViewPropTypes.style,
    seekBarFullWidth: ViewPropTypes.style,
    seekBarProgress: ViewPropTypes.style,
    seekBarKnob: ViewPropTypes.style,
    seekBarKnobSeeking: ViewPropTypes.style,
    seekBarBackground: ViewPropTypes.style,
    thumbnail: Image.propTypes.style,
    playButton: TouchableOpacity.propTypes.style,
    playArrow: Icon.propTypes.style,
  }),
  onEnd: PropTypes.func,
  onProgress: PropTypes.func,
  onLoad: PropTypes.func,
  onStart: PropTypes.func,
  onPlayPress: PropTypes.func,
  onHideControls: PropTypes.func,
  onShowControls: PropTypes.func,
  onMutePress: PropTypes.func,
};

VideoPlayer.defaultProps = {
  videoWidth: 1280,
  videoHeight: 720,
  autoplay: false,
  controlsTimeout: 2000,
  loop: false,
  resizeMode: 'contain',
  disableSeek: false,
  pauseOnPress: false,
  fullScreenOnLongPress: false,
  customStyles: {},
};
