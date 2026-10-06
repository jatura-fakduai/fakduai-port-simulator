(function(root) {
  // One event, three visible stages; completion happens only after the truck exits.
  function releaseStageAt(progress) {
    const t = Math.max(0, Math.min(1, progress));
    if (t < .48) return {phase:'agv', progress:t/.48};
    if (t < .66) return {phase:'handover', progress:(t-.48)/.18};
    if (t < .95) return {phase:'truck', progress:(t-.66)/.29};
    return {phase:'done', progress:1};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {releaseStageAt};
  else root.freightMotion = {releaseStageAt};
})(typeof window !== 'undefined' ? window : globalThis);
