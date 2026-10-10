import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_TRACK,normalizeMusicSettings} from '../src/scene/room-music-settings.js';
test('Lagoon is the bundled default track, loaded only on an explicit playback request',()=>{assert.equal(DEFAULT_TRACK.url,'/assets/audio/lagoon.mp3');assert.equal(DEFAULT_TRACK.title,'DJ ROOTS - Lagoon');});
test('persisted music controls clamp invalid or missing values',()=>{assert.deepEqual(normalizeMusicSettings({volume:Infinity,reactivity:-4}),{volume:.2,reactivity:0});assert.deepEqual(normalizeMusicSettings({volume:5,reactivity:.25}),{volume:1,reactivity:.25});});
