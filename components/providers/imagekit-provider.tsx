"use client";

import { ImageKitProvider as IKProvider } from "@imagekit/next";
import type { ComponentProps } from "react";

const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "";

export function ImageKitProvider({
  children,
  ...props
}: Omit<ComponentProps<typeof IKProvider>, "urlEndpoint">) {
  return (
    <IKProvider urlEndpoint={urlEndpoint} {...props}>
      {children}
    </IKProvider>
  );
}
