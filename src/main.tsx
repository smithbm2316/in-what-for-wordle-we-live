import { render } from 'preact';
import { App } from './app';
import './index.css';
// Necessary for loading pwa features in dev
// @ts-ignore
import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });

render(<App />, document.getElementById('app')!);
