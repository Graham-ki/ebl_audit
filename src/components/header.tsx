'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CircleUser, Menu, Moon, Package2, Search, Sun, X } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { createClient } from '@/supabase/client';
import { debounce } from 'lodash';

const NAV_LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <Package2 className="h-4 w-4" /> },
  { href: '/admin/stock', label: 'Stock', icon: <Package2 className="h-4 w-4" /> },
  { href: '/admin/suppliers', label: 'Suppliers', icon: <CircleUser className="h-4 w-4" /> },
  { href: '/admin/ledgers', label: 'Finances', icon: <Package2 className="h-4 w-4" /> },
  { href: '/admin/analytics', label: 'Assets', icon: <Package2 className="h-4 w-4" /> },
];

export const Header = () => {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const router = useRouter();
  const supabase = createClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query);
  };

  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setLoading(true);

      const searchPromises = [
        supabase.from('product').select('*').ilike('title', `%${query}%`),
        supabase.from('products_materials').select('*').ilike('product_id', `%${query}%`),
        supabase.from('order').select('*').ilike('slug', `%${query}%`),
        supabase.from('materials').select('*').ilike('name', `%${query}%`),
        supabase.from('expenses').select('*').ilike('item', `%${query}%`),
        supabase.from('users').select('*').ilike('name', `%${query}%`),
        supabase.from('finance').select('*').or(`mode_of_payment.ilike.%${query}%,mode_of_mobilemoney.ilike.%${query}%,bank_name.ilike.%${query}%`),
      ];

      try {
        const results = await Promise.all(searchPromises);
        const combinedResults = results.flatMap((result, index) => {
          const tableNames = [
            'product',
            'products_materials',
            'order',
            'materials',
            'expenses',
            'users',
            'finance',
          ];
          return (result.data || []).map((item) => ({
            ...item,
            table: tableNames[index],
          }));
        });
        setSearchResults(combinedResults);
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    [supabase]
  );

  const handleResultClick = (result: any) => {
    if (result.table === 'user_ledger') {
      router.push(`/admin/search/user_ledger/${result.id}`);
    } else {
      router.push(`/admin/search/${result.table}/${result.id}`);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center space-x-1">
        <Link
          href="/"
          className="flex items-center justify-center h-10 w-10 rounded-lg mr-2"
        >
          <Package2 className="h-6 w-6" />
        </Link>
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors relative',
              'hover:bg-accent hover:text-accent-foreground',
              pathname === href
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            {label}
            {pathname === href && (
              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4/5 h-0.5 bg-primary-foreground rounded-full" />
            )}
          </Link>
        ))}
      </nav>

      {/* Mobile Navigation */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="pt-12">
          <nav className="grid gap-2">
            {NAV_LINKS.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all',
                  'hover:text-primary hover:bg-accent',
                  pathname === href && 'bg-accent text-primary'
                )}
              >
                {icon}
                {label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Search and User Controls */}
      <div className="flex w-full items-center justify-end gap-2 md:gap-4 md:ml-auto">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products, orders, users..."
              className="pl-9 pr-8 w-full"
              value={searchQuery}
              onChange={handleSearchInputChange}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover text-popover-foreground rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.table}-${result.id}`}
                      className="w-full text-left p-3 hover:bg-accent transition-colors"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {result.title || result.material_name || result.slug || 
                             result.name || result.item || result.email || 
                             result.mode_of_payment || result.mode_of_mobilemoney || 
                             result.bank_name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {result.table.replace('_', ' ')}
                          </p>
                        </div>
                        {result.table === 'finance' && (
                          <span className="text-sm font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                            UGX {result.amount_paid}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No results found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <CircleUser className="h-5 w-5" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/profile" className="w-full">
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/settings" className="w-full">
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
