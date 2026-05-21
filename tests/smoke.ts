const res = await fetch("http://localhost:3000/health");
if (!res.ok) {
  console.error("health check failed", res.status);
  process.exit(1);
}
const body = await res.json();
if (!body.ok) {
  console.error("health body invalid", body);
  process.exit(1);
}
console.log("smoke ok");
export {};
