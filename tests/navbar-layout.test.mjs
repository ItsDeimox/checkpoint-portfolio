import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderRoomHeader} from '../src/ui/room-visitor-shell.js';
const styles=fs.readFileSync(new URL('../src/styles-sections.css',import.meta.url),'utf8');
test('destination header overrides showroom inset to fill viewport top',()=>{assert.match(styles,/body\[data-page="home"\]\.section-active #header\s*\{[^}]*top:\s*0(?:px)?;/);assert.match(styles,/body\[data-page="home"\]\.section-active #header\s*\{[^}]*left:\s*0(?:px)?;/);assert.match(styles,/body\[data-page="home"\]\.section-active #header\s*\{[^}]*right:\s*0(?:px)?;/);});
test('header material paints uninterrupted behind the logo and navigation',()=>{assert.match(styles,/body\[data-page="home"\]\.section-active\s+#header\s*\{[^}]*background:/);});
test('internal brand keeps the spin enabled and exposes a separate arrow',()=>{const h=renderRoomHeader({}, {returnToShowroom:true});assert.match(h,/<button[^>]*data-spin-logo/);assert.match(h,/<a[^>]*data-return-showroom/);assert.ok(h.indexOf('room-brand-arrow')<h.indexOf('id="brand-spin"'));});
