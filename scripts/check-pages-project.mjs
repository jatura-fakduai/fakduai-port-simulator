import {appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export function projectExists(status, data) {
  if (status === 200 && data.success === true && data.result?.name === 'fakduai-port-simulator') return true;
  // Only the explicit Pages project-not-found response permits creation.
  if ((status === 404 || status === 400) && data.success === false &&
      data.errors?.some(error => error.code === 8000007)) return false;
  throw new Error('Pages project lookup failed (HTTP ' + status + ', codes ' +
    (data.errors || []).map(error => error.code).join(',') +
    '). Check Cloudflare account ID and Pages Edit token permissions.');
}
async function main() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID, token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token || !process.env.GITHUB_OUTPUT) throw new Error('Missing deployment environment');
  const response = await fetch('https://api.cloudflare.com/client/v4/accounts/' +
    encodeURIComponent(accountId) + '/pages/projects/fakduai-port-simulator', {
    headers: {Authorization: 'Bearer ' + token},
    signal: AbortSignal.timeout(30000),
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('Cloudflare returned a non-JSON response; not creating a project.'); }
  const exists = projectExists(response.status, data);
  appendFileSync(process.env.GITHUB_OUTPUT, 'exists=' + exists + '\n');
  console.log(exists ? 'Pages project exists; skipping creation.' : 'Pages project is missing; creating before deployment.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {console.error(error.message); process.exitCode = 1;});
}
