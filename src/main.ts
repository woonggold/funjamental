import './style.css';
import { createBackend } from './net';
import { App } from './ui/app';

const root = document.getElementById('app')!;
root.innerHTML = '<div class="loading">불러오는 중…</div>';
createBackend().then((backend) => new App(root, backend));
