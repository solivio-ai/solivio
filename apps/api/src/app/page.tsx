const endpoints = [
  "/api/health",
  "/api/products",
  "/api/requests",
  "/api/offers"
];

export default function ApiHome() {
  return (
    <main>
      <h1>Solivio API</h1>
      <p>Development API for product matching, customer requests, and offer drafts.</p>
      <h2>Available endpoints</h2>
      <ul>
        {endpoints.map((endpoint) => (
          <li key={endpoint}>
            <code>{endpoint}</code>
          </li>
        ))}
      </ul>
    </main>
  );
}
