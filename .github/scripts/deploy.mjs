#!/usr/bin/env node
// Deploys source code to Hostinger shared hosting as a Node.js application.
// Uses Hostinger Hosting API: uploads archive, fetches build settings, triggers build.
// Required env: API_TOKEN, DOMAIN, ARCHIVE_PATH
// Optional env: API_BASE_URL (default: https://developers.hostinger.com)

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as tus from 'tus-js-client';

const API_TOKEN = process.env.API_TOKEN;
const DOMAIN = process.env.DOMAIN;
const ARCHIVE_PATH = process.env.ARCHIVE_PATH;
const API_BASE = (process.env.API_BASE_URL || 'https://developers.hostinger.com').replace(/\/$/, '');

if (!API_TOKEN) throw new Error('API_TOKEN is required');
if (!DOMAIN) throw new Error('DOMAIN is required');
if (!ARCHIVE_PATH) throw new Error('ARCHIVE_PATH is required');
if (!fs.existsSync(ARCHIVE_PATH)) throw new Error(`Archive not found: ${ARCHIVE_PATH}`);

const authHeaders = { Authorization: `Bearer ${API_TOKEN}` };

async function resolveUsername(domain) {
  console.log(`Resolving username for domain: ${domain}`);
  const res = await axios.get(`${API_BASE}/api/hosting/v1/websites?domain=${encodeURIComponent(domain)}`, {
    headers: authHeaders,
    validateStatus: (s) => s < 500,
  });
  if (res.status !== 200) throw new Error(`Failed to resolve username: ${res.status} ${JSON.stringify(res.data)}`);
  const websites = res.data?.data;
  if (!websites?.length) throw new Error(`No website found for domain: ${domain}`);
  const username = websites[0].username;
  console.log(`Resolved username: ${username}`);
  return username;
}

async function fetchUploadCredentials(username, domain) {
  console.log(`Fetching upload credentials...`);
  const res = await axios.post(`${API_BASE}/api/hosting/v1/files/upload-urls`, { username, domain }, {
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    validateStatus: (s) => s < 500,
  });
  if (res.status !== 200) throw new Error(`Failed to get upload credentials: ${res.status} ${JSON.stringify(res.data)}`);
  return res.data;
}

async function uploadArchive(archivePath, uploadUrl, authRestToken, authToken) {
  const archiveBasename = path.basename(archivePath);
  const stats = fs.statSync(archivePath);
  const fileSize = stats.size;
  console.log(`Uploading archive (${(fileSize / 1024 / 1024).toFixed(2)} MB): ${archiveBasename}`);

  const cleanUploadUrl = uploadUrl.replace(/\/$/, '');
  const uploadUrlWithFile = `${cleanUploadUrl}/${archiveBasename}?override=true`;

  const requestHeaders = {
    'X-Auth': authToken,
    'X-Auth-Rest': authRestToken,
    'upload-length': String(fileSize),
    'upload-offset': '0',
  };

  // TUS pre-flight POST
  await axios.post(uploadUrlWithFile, '', {
    headers: requestHeaders,
    validateStatus: (s) => s === 201,
  });

  // TUS upload
  await new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(archivePath);
    const upload = new tus.Upload(fileStream, {
      uploadUrl: uploadUrlWithFile,
      retryDelays: [1000, 2000, 4000, 8000],
      uploadDataDuringCreation: false,
      parallelUploads: 1,
      chunkSize: 10 * 1024 * 1024,
      headers: requestHeaders,
      removeFingerprintOnSuccess: true,
      uploadSize: fileSize,
      metadata: { filename: archiveBasename },
      onError: (err) => reject(new Error(`TUS upload error: ${err.message}`)),
      onSuccess: () => {
        console.log(`Archive uploaded successfully: ${archiveBasename}`);
        resolve();
      },
    });
    upload.start();
  });

  return archiveBasename;
}

async function fetchBuildSettings(username, domain, archiveBasename) {
  console.log(`Fetching build settings...`);
  const url = `${API_BASE}/api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds/settings/from-archive?archive_path=${encodeURIComponent(archiveBasename)}`;
  const res = await axios.get(url, {
    headers: authHeaders,
    validateStatus: (s) => s < 500,
  });
  if (res.status !== 200) throw new Error(`Failed to fetch build settings: ${res.status} ${JSON.stringify(res.data)}`);
  console.log(`Build settings: ${JSON.stringify(res.data)}`);
  return res.data;
}

async function triggerBuild(username, domain, archiveBasename, buildSettings) {
  console.log(`Triggering build for ${domain}...`);
  const url = `${API_BASE}/api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds`;
  const buildData = {
    ...buildSettings,
    node_version: buildSettings?.node_version || 20,
    source_type: 'archive',
    source_options: { archive_path: archiveBasename },
  };
  const res = await axios.post(url, buildData, {
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    validateStatus: (s) => s < 500,
  });
  if (res.status !== 200) throw new Error(`Failed to trigger build: ${res.status} ${JSON.stringify(res.data)}`);
  console.log(`Build triggered successfully: ${JSON.stringify(res.data)}`);
  return res.data;
}

async function main() {
  const username = await resolveUsername(DOMAIN);
  const creds = await fetchUploadCredentials(username, DOMAIN);
  const { url: uploadUrl, auth_key: authToken, rest_auth_key: authRestToken } = creds;

  if (!uploadUrl || !authToken || !authRestToken) {
    throw new Error(`Invalid upload credentials: ${JSON.stringify(creds)}`);
  }

  const archiveBasename = await uploadArchive(ARCHIVE_PATH, uploadUrl, authRestToken, authToken);
  const buildSettings = await fetchBuildSettings(username, DOMAIN, archiveBasename);
  await triggerBuild(username, DOMAIN, archiveBasename, buildSettings);
  console.log('Deployment complete. Build is running on Hostinger.');
}

main().catch((err) => {
  console.error('Deployment failed:', err.message);
  process.exit(1);
});
