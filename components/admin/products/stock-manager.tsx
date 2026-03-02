"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner is used for toasts

export default function StockManager({ productId }: { productId: string }) {
  const [stock, setStock] = useState<any[]>([]);
  const [newStock, setNewStock] = useState({
    size: "",
    color: "",
    quantity: "0",
  });
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Replace with actual Medusa/Backend API calls
  const fetchStock = useCallback(async () => {
    setIsLoading(true);
    try {
      // Implement backend fetch logic here
      // const response = await fetch(`/api/admin/products/${productId}/variants`);
      // if(response.ok) {
      //     const data = await response.json();
      //     setStock(data);
      // }
      console.warn("fetchStock requires Medusa API integration");
    } catch (e) {
      toast.error("Failed to load stock");
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchStock();
  }, [productId, fetchStock]);

  const handleAddStock = async () => {
    if (!newStock.size || !newStock.color) return;

    // TODO: Connect to backend API
    // const response = await fetch(`/api/admin/products/${productId}/variants`, { method: 'POST', body: JSON.stringify({...newStock}) });
    toast.warning("Implementation required to add stock via Medusa API");
    setNewStock({ size: "", color: "", quantity: "0" });
  };

  const handleUpdateQuantity = async (id: string, qty: number) => {
    // TODO: Connect to backend API
    // await fetch(`/api/admin/variants/${id}`, { method: 'PATCH', body: JSON.stringify({ inventory_quantity: qty }) });
    setStock(stock.map((s) => (s.id === id ? { ...s, quantity: qty } : s)));
    toast.warning("Implementation required to update stock via Medusa API");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this stock record?")) return;
    // TODO: Connect to backend API
    // await fetch(`/api/admin/variants/${id}`, { method: 'DELETE' });
    toast.warning("Implementation required to delete stock via Medusa API");
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-6">
      <h3 className="text-lg font-medium">Stock Management</h3>

      <div className="flex gap-2 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium">Size</label>
          <Input
            value={newStock.size}
            onChange={(e) => setNewStock({ ...newStock, size: e.target.value })}
            placeholder="e.g. M"
            className="w-24"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Color</label>
          <Input
            value={newStock.color}
            onChange={(e) =>
              setNewStock({ ...newStock, color: e.target.value })
            }
            placeholder="e.g. Black"
            className="w-32"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Qty</label>
          <Input
            type="number"
            value={newStock.quantity}
            onChange={(e) =>
              setNewStock({ ...newStock, quantity: e.target.value })
            }
            placeholder="0"
            className="w-20"
          />
        </div>
        <Button onClick={handleAddStock} size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Size</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stock.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No stock records.
                </TableCell>
              </TableRow>
            ) : (
              stock.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.size}</TableCell>
                  <TableCell>{item.color}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateQuantity(item.id, parseInt(e.target.value))
                      }
                      className="w-20 h-8"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
