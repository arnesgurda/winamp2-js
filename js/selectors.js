import { denormalize, getTimeStr, clamp, percentToIndex } from "./utils";
import {
  BANDS,
  PLAYLIST_RESIZE_SEGMENT_HEIGHT,
  TRACK_HEIGHT
} from "./constants";
import { createSelector } from "reselect";
import * as fromPlaylist from "./reducers/playlist";

export const getEqfData = state => {
  const { sliders } = state.equalizer;
  const preset = {
    name: "Entry1",
    preamp: denormalize(sliders.preamp)
  };
  BANDS.forEach(band => {
    preset[`hz${band}`] = denormalize(sliders[band]);
  });
  const eqfData = {
    presets: [preset],
    type: "Winamp EQ library file v1.1"
  };
  return eqfData;
};

const getTracks = state => state.playlist.tracks;
const getTrackOrder = state => state.playlist.trackOrder;

export const getOrderedTracks = createSelector(
  getTracks,
  getTrackOrder,
  (tracks, trackOrder) => trackOrder.filter(id => tracks[id])
);

const getOrderedTrackObjects = createSelector(
  getTracks,
  getOrderedTracks,
  (tracks, trackOrder) => trackOrder.map(id => tracks[id])
);

const getSelectedTrackObjects = createSelector(getOrderedTrackObjects, tracks =>
  tracks.filter(track => track.selected)
);

const runningTimeFromTracks = tracks =>
  tracks.reduce((time, track) => time + Number(track.duration), 0);

const getTotalRunningTime = createSelector(
  getOrderedTrackObjects,
  runningTimeFromTracks
);

const getSelectedRunningTime = createSelector(
  getSelectedTrackObjects,
  runningTimeFromTracks
);

// Note: We should append "+" to these values if some of the tracks are of unknown time.
export const getRunningTimeMessage = createSelector(
  getTotalRunningTime,
  getSelectedRunningTime,
  (totalRunningTime, selectedRunningTime) =>
    `${getTimeStr(selectedRunningTime)}/${getTimeStr(totalRunningTime)}`
);

// TODO: use slectors to get memoization
export const getCurrentTrackIndex = state =>
  state.playlist.trackOrder.indexOf(state.playlist.currentTrack);

export const getCurrentTrackNumber = createSelector(
  getCurrentTrackIndex,
  currentTrackIndex => currentTrackIndex + 1
);

export const getCurrentTrackId = state => state.playlist.currentTrack;

export const nextTrack = (state, n = 1) => {
  const { playlist: { trackOrder }, media: { repeat } } = state;
  if (trackOrder.length === 0) {
    return null;
  }

  const currentIndex = getCurrentTrackIndex(state);

  let nextIndex = currentIndex + n;
  if (repeat) {
    nextIndex = nextIndex % trackOrder.length;
    if (nextIndex < 0) {
      // Handle wrapping around backwards
      nextIndex += trackOrder.length;
    }
    return trackOrder[nextIndex];
  }

  if (currentIndex === trackOrder.length - 1 && n > 0) {
    return null;
  } else if (currentIndex === 0 && n < 0) {
    return null;
  }

  nextIndex = clamp(nextIndex, 0, trackOrder.length - 1);
  return trackOrder[nextIndex];
};

export const getPlaylistScrollPosition = state =>
  state.display.playlistScrollPosition;

const BASE_WINDOW_HEIGHT = 58;
export const getNumberOfVisibleTracks = state => {
  const { playlistSize } = state.display;
  return Math.floor(
    (BASE_WINDOW_HEIGHT + PLAYLIST_RESIZE_SEGMENT_HEIGHT * playlistSize[1]) /
      TRACK_HEIGHT
  );
};

export const getOverflowTrackCount = createSelector(
  getTrackOrder,
  getNumberOfVisibleTracks,
  (trackOrder, numberOfVisibleTracks) =>
    Math.max(0, trackOrder.length - numberOfVisibleTracks)
);

export const getScrollOffset = createSelector(
  getPlaylistScrollPosition,
  getTrackOrder,
  getNumberOfVisibleTracks,
  (playlistScrollPosition, trackOrder, numberOfVisibleTracks) => {
    const overflow = Math.max(0, trackOrder.length - numberOfVisibleTracks);
    return percentToIndex(playlistScrollPosition / 100, overflow + 1);
  }
);

export const getVisibleTrackIds = createSelector(
  getScrollOffset,
  getTrackOrder,
  getNumberOfVisibleTracks,
  (offset, trackOrder, numberOfVisibleTracks) =>
    trackOrder.slice(offset, offset + numberOfVisibleTracks)
);

export const getPlaylist = state => state.playlist;
export const getDuration = state => state.media.length;
export const getTrackDisplayName = (state, trackId) =>
  fromPlaylist.getTrackDisplayName(getPlaylist(state), trackId);

export const getCurrentTrackDisplayName = state => {
  const id = getCurrentTrackId(state);
  return getTrackDisplayName(state, id);
};

export const getMediaText = createSelector(
  getCurrentTrackNumber,
  getCurrentTrackDisplayName,
  getDuration,
  (trackNumber, name, duration) =>
    `${trackNumber}. ${name} (${getTimeStr(duration)})  ***  `
);
