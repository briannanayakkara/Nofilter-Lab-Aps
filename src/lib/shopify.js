import shopifyConfig from "../../shopify-config";

// Storefront API version. Bump this to a newer "YYYY-MM" as Shopify releases them.
const API_VERSION = "2026-04";

export const isShopifyConfigured = () => {
  const { storeDomain, storefrontAccessToken, productHandle } = shopifyConfig;
  return Boolean(storeDomain && storefrontAccessToken && productHandle);
};

// Single entry point to the Storefront GraphQL API. Everything Shopify goes
// through here so components never talk to the API directly.
const storefrontFetch = async (query, variables) => {
  const { storeDomain, storefrontAccessToken } = shopifyConfig;
  let res;
  try {
    res = await fetch(`https://${storeDomain}/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (e) {
    throw new Error("Couldn't reach your Shopify store. Check your store domain in shopify-config.js.");
  }
  if (!res.ok) {
    throw new Error(`Shopify rejected the request (${res.status}). Check your store domain and Storefront access token.`);
  }
  const json = await res.json();
  if (json.errors && json.errors.length) {
    throw new Error(json.errors[0].message || "Shopify returned an error.");
  }
  return json.data;
};

const PRODUCT_VARIANT_QUERY = `
  query ProductVariant($handle: String!) {
    product(handle: $handle) {
      variants(first: 1) {
        edges {
          node {
            id
            availableForSale
          }
        }
      }
    }
  }
`;

const CART_CREATE_MUTATION = `
  mutation CartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart {
        checkoutUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Looks up the product's first variant, creates a Shopify cart for it, and
// returns the hosted checkout URL to redirect the buyer to. Shopify's checkout
// handles payment, shipping, and taxes from there.
export const buildCheckoutUrl = async ({ quantity }) => {
  if (!isShopifyConfigured()) {
    throw new Error("Shopify isn't connected yet — see guide.html");
  }

  const productData = await storefrontFetch(PRODUCT_VARIANT_QUERY, {
    handle: shopifyConfig.productHandle,
  });
  const variant = productData?.product?.variants?.edges?.[0]?.node;
  if (!variant) {
    throw new Error(`No product found for handle "${shopifyConfig.productHandle}".`);
  }
  if (!variant.availableForSale) {
    throw new Error("This product is currently out of stock.");
  }

  const cartData = await storefrontFetch(CART_CREATE_MUTATION, {
    lines: [{ merchandiseId: variant.id, quantity }],
  });
  const result = cartData?.cartCreate;
  if (result?.userErrors?.length) {
    throw new Error(result.userErrors[0].message);
  }
  const checkoutUrl = result?.cart?.checkoutUrl;
  if (!checkoutUrl) {
    throw new Error("Couldn't start checkout. Please try again.");
  }
  return checkoutUrl;
};
