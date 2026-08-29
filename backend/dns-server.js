import dns from "dns";

console.log("DNS Servers:", dns.getServers());

dns.resolveSrv(
  "_mongodb._tcp.insta-cluster.c27occg.mongodb.net",
  (err, records) => {
    console.log(err);
    console.log(records);
  }
);