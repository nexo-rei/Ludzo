import React, { useEffect, useState, useCallback } from 'react';
import { Search, Ban, CheckCircle, Coins, DollarSign } from 'lucide-react';
import { getAdminUsers, toggleBanUser } from '@/services/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/use-debounce';

interface UserRow {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
  is_banned: boolean;
  created_at: string;
  wallets?: { coins_balance: number; usdt_balance: number } | null;
}

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const { users: u, total: t } = await getAdminUsers(p, debouncedSearch);
      setUsers(u as UserRow[]);
      setTotal(t);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { setPage(0); load(0); }, [debouncedSearch, load]);

  const handleBan = async (user: UserRow) => {
    await toggleBanUser(user.id, !user.is_banned);
    toast.success(user.is_banned ? `${user.first_name} unbanned` : `${user.first_name} banned`);
    load(page);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground">{total} total users</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 h-9" />
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-border">
              {['User', 'Telegram ID', 'Coins', 'USDT', 'Joined', 'Status', 'Action'].map(h => (
                <th key={h} className="text-xs font-semibold text-muted-foreground uppercase px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-2"><Skeleton className="h-10 rounded-lg" /></td></tr>
              ))
            ) : users.map(u => {
              const wallet = Array.isArray(u.wallets) ? u.wallets[0] : u.wallets;
              return (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {u.photo_url
                        ? <img src={u.photo_url} alt={u.first_name} className="w-7 h-7 rounded-full object-cover" />
                        : <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{u.first_name.charAt(0)}</div>
                      }
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.first_name} {u.last_name ?? ''}</p>
                        {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground font-mono whitespace-nowrap">{u.telegram_id}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="flex items-center gap-1 text-sm font-medium text-amber-500">
                      <Coins className="w-3 h-3" />{(wallet?.coins_balance ?? 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="flex items-center gap-1 text-sm font-medium text-emerald-500">
                      <DollarSign className="w-3 h-3" />{Number(wallet?.usdt_balance ?? 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(u.created_at), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {u.is_banned
                      ? <span className="text-xs text-destructive font-medium">Banned</span>
                      : <span className="text-xs text-success font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" />Active</span>
                    }
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Button
                      size="sm"
                      variant={u.is_banned ? 'outline' : 'destructive'}
                      className="h-7 text-xs gap-1"
                      onClick={() => handleBan(u)}
                    >
                      <Ban className="w-3 h-3" />
                      {u.is_banned ? 'Unban' : 'Ban'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setPage(p => p - 1); load(page - 1); }} disabled={page === 0}>Prev</Button>
          <span className="text-sm text-muted-foreground flex items-center">Page {page + 1} of {Math.ceil(total / 20)}</span>
          <Button variant="outline" size="sm" onClick={() => { setPage(p => p + 1); load(page + 1); }} disabled={(page + 1) * 20 >= total}>Next</Button>
        </div>
      )}
    </div>
  );
}
