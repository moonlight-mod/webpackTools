import { onChunkLoaded } from "../spacepackEverywhere";
import { getSpacepack } from "../spacepackLite";
window.spacepackChunk = [["spacepack"], { spacepack: getSpacepack(null, true) }, onChunkLoaded];
