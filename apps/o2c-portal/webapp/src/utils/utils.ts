// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

export const generateQrImageWithTitle = (qrDataUrl: string, title: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const padding = 24;
      const titleAreaHeight = 72;
      const canvasSize = 400;

      const canvas = document.createElement("canvas");
      canvas.width = canvasSize;
      canvas.height = canvasSize + titleAreaHeight;

      const ctx = canvas.getContext("2d")!;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, canvasSize, canvasSize);

      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, canvasSize, canvasSize, titleAreaHeight);

      ctx.fillStyle = "#1a1a1a";
      ctx.font = "bold 24px 'Inter', 'Helvetica Neue', Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const maxWidth = canvasSize - padding * 2;
      const truncated =
        ctx.measureText(title).width > maxWidth
          ? title.slice(0, Math.floor((maxWidth / ctx.measureText(title).width) * title.length) - 1) + "…"
          : title;

      ctx.fillText(truncated, canvasSize / 2, canvasSize + titleAreaHeight / 2);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = qrDataUrl;
  });
};

export const isIncludedRole = (a: string[], b: string[]): boolean => {
  return [...getCrossItems(a, b), ...getCrossItems(b, a)].length > 0;
};

function getCrossItems<Role>(a: Role[], b: Role[]): Role[] {
  return a.filter((element) => {
    return b.includes(element);
  });
}
