import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_TRACK,normalizeMusicSettings} from '../src/scene/room-music-settings.js';
test('no soundtrack downloads before the visitor chooses a file',()=>{assert.equal(DEFAULT_TRACK.url,'');});
test('persisted music controls clamp invalid or missing values',()=>{assert.deepEqual(normalizeMusicSettings({volume:Infinity,reactivity:-4}),{volume:.45,reactivity:0});assert.deepEqual(normalizeMusicSettings({volume:5,reactivity:.25}),{volume:1,reactivity:.25});});
