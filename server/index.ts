#!/usr/bin/env node

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("Starting React-only Restaurant Management System...");
console.log("Removed all Node.js/Express server code");
console.log("Using external APIs via generic repository pattern");

// Start Vite development server for React frontend only
const projectRoot = join(__dirname, '..');
const clientDir = join(projectRoot, 'client');

const viteProcess = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '5000'], {
  cwd: clientDir,
  stdio: 'inherit',
  shell: true
});

viteProcess.on('error', (error: any) => {
  console.error('Failed to start Vite server:', error);
  process.exit(1);
});

viteProcess.on('close', (code: any) => {
  console.log(`Vite server exited with code ${code}`);
  process.exit(code || 0);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down...');
  viteProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  viteProcess.kill('SIGTERM');
});