import shopifyConfig from "../../shopify-config";

const BUY_BUTTON_SCRIPT_URL = "https://sdks.shopifycdn.com/buy-button/latest/buybutton.js";

let scriptLoadPromise = null;

const loadShopifyScript = () => {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.ShopifyBuy) return Promise.resolve(window.ShopifyBuy);
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = BUY_BUTTON_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.ShopifyBuy) resolve(window.ShopifyBuy);
      else reject(new Error("Shopify Buy SDK failed to load"));
    };
    script.onerror = () => reject(new Error("Could not load the Shopify Buy SDK script"));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
};

export const isShopifyConfigured = () => {
  const { storeDomain, storefrontAccessToken, productHandle } = shopifyConfig;
  return Boolean(storeDomain && storefrontAccessToken && productHandle);
};

let clientPromise = null;

const getClient = async () => {
  if (clientPromise) return clientPromise;
  clientPromise = loadShopifyScript().then((ShopifyBuy) =>
    ShopifyBuy.buildClient({
      domain: shopifyConfig.storeDomain,
      storefrontAccessToken: shopifyConfig.storefrontAccessToken,
    })
  );
  return clientPromise;
};

export const buildCheckoutUrl = async ({ quantity }) => {
  if (!isShopifyConfigured()) {
    throw new Error("Shopify isn't connected yet — see guide.html");
  }
  const client = await getClient();
  const product = await client.product.fetchByHandle(shopifyConfig.productHandle);
  if (!product || !product.variants || product.variants.length === 0) {
    throw new Error(`No product found for handle "${shopifyConfig.productHandle}"`);
  }
  const variantId = product.variants[0].id;
  const checkout = await client.checkout.create();
  const updated = await client.checkout.addLineItems(checkout.id, [
    { variantId, quantity },
  ]);
  return updated.webUrl;
};
