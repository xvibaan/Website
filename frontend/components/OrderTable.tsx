import React, { useEffect, useState } from "react";
import { CheckCircle, Clock, XCircle, Key, PackageOpen, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/Table";
import { Badge } from "./ui/Badge";
import { Skeleton } from "./ui/Skeleton";

interface OrderItem {
  id: number;
  product_name_snapshot: string;
  variant_name_snapshot: string;
  price_at_purchase: number;
  product_key?: {
    key_value: string;
  };
}

interface Order {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
}

export default function OrderTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await api.get<Order[]>("/v1/orders/");
        setOrders(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch orders");
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrders();
  }, []);

  if (isLoading) {
    return (
      <Card className="p-8 border-none bg-card/50">
        <Skeleton className="h-6 w-48 mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 flex items-center gap-3 border-destructive/20">
        <AlertCircle className="w-5 h-5 text-destructive" />
        <p className="text-destructive font-medium">{error}</p>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed border-card-border/50 bg-background/50">
        <PackageOpen className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-foreground mb-2 font-sans">No Orders Yet</h3>
        <p className="text-muted-foreground font-sans text-sm">Your purchased products and serial keys will appear here.</p>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return <Badge variant="success"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Completed</Badge>;
      case "PENDING":
        return <Badge variant="secondary"><Clock className="w-3.5 h-3.5 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="destructive"><XCircle className="w-3.5 h-3.5 mr-1" /> {status}</Badge>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-card-border bg-background/50 py-4">
          <CardTitle className="text-lg font-sans">Purchase History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-background/80">
              <TableRow>
                <TableHead className="font-semibold font-sans text-muted-foreground">Order Details</TableHead>
                <TableHead className="font-semibold font-sans text-muted-foreground">Date</TableHead>
                <TableHead className="font-semibold font-sans text-muted-foreground">Total</TableHead>
                <TableHead className="font-semibold font-sans text-muted-foreground">Status</TableHead>
                <TableHead className="text-right font-semibold font-sans text-muted-foreground pr-6">License / Key</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="group">
                  <TableCell className="pl-6">
                    <div className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors font-sans">
                      Order #{order.id}
                    </div>
                    <div className="text-xs text-muted-foreground font-sans">
                      {order.items.length > 0 ? `${order.items[0].product_name_snapshot} - ${order.items[0].variant_name_snapshot}` : "No items"}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </TableCell>
                  <TableCell className="font-medium text-foreground font-mono">
                    ₹{Number(order.total_amount).toFixed(2)}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right pr-6">
                    {order.status === "COMPLETED" && order.items[0]?.product_key ? (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5">
                        <Key className="w-3.5 h-3.5 text-primary" />
                        <code className="text-xs font-mono text-foreground select-all">
                          {order.items[0].product_key.key_value}
                        </code>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic font-sans">Not available</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
