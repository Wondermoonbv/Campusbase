import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useViewAs } from "@/contexts/ViewAsContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Search, UserPlus, Eye, KeyRound, Copy, RefreshCw } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { toast } from "sonner";
import type { AppUser, UserRole } from "@/contexts/AuthContext";
import { writeAuditLog } from "@/lib/audit";
import { SortableTableHead, useSort, sortItems } from "@/components/ui/SortableTableHead";

export default function GebruikersPage() {
  const { users, updateUser, user: currentUser, isAdmin, refreshUsers } = useAuth();
  const { simulateUser } = useViewAs();
  const navigate = useNavigate();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", role: "viewer" as UserRole });

  // Invite form
  const [inviteForm, setInviteForm] = useState({ fullName: "", email: "", password: "", role: "editor" as UserRole });
  const [inviteLoading, setInviteLoading] = useState(false);

  // Reset password
  const [resetUser, setResetUser] = useState<AppUser | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pw = "";
    for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setResetPassword(pw);
  };

  const openResetDialog = (u: AppUser) => {
    setResetUser(u);
    setResetPassword("");
    setResetSuccess(false);
    setResetOpen(true);
  };

  const handleResetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || resetPassword.length < 8) {
      toast.error("Wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }
    setResetLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: {
          targetEmail: resetUser.email,
          newPassword: resetPassword,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Wachtwoord gereset voor ${resetUser.name}. Deel het tijdelijke wachtwoord via een veilig kanaal (bijv. Teams).`);
      setResetSuccess(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Fout bij resetten van wachtwoord.");
    } finally {
      setResetLoading(false);
    }
  }, [resetUser, resetPassword]);

  const copyPassword = () => {
    navigator.clipboard.writeText(resetPassword);
    toast.success("Wachtwoord gekopieerd naar klembord.");
  };

  // Delete user
  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteUser = useCallback(async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase.rpc("soft_delete_user", { target_user_id: deleteUser.id });
      if (error) throw error;
      toast.success("Gebruiker verwijderd.");
      refreshUsers?.();
      setDeleteOpen(false);
      setDeleteUser(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Fout bij verwijderen.");
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteUser, refreshUsers]);

  const openDeleteDialog = (u: AppUser) => {
    setDeleteUser(u);
    setDeleteOpen(true);
  };

  const { sort, toggleSort } = useSort("lastName");

  const sorted = useMemo(() => {
    return sortItems(users, sort, (u, key) => {
      switch (key) {
        case "lastName": return u.lastName ?? u.name;
        case "email": return u.email;
        case "role": return u.role;
        default: return u.lastName ?? u.name;
      }
    });
  }, [users, sort]);

  // Invite user via RPC
  const handleInvite = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.fullName || !inviteForm.email || !inviteForm.password) {
      toast.error("Vul alle verplichte velden in.");
      return;
    }
    if (inviteForm.password.length < 8) {
      toast.error("Wachtwoord moet minimaal 8 tekens zijn.");
      return;
    }
    setInviteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-invite-user", {
        body: {
          email: inviteForm.email.trim().toLowerCase(),
          password: inviteForm.password,
          fullName: inviteForm.fullName.trim(),
          role: inviteForm.role,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Gebruiker aangemaakt.");
      setInviteOpen(false);
      setInviteForm({ fullName: "", email: "", password: "", role: "editor" });
      refreshUsers?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Fout bij aanmaken van gebruiker.");
    } finally {
      setInviteLoading(false);
    }
  }, [inviteForm, refreshUsers]);

  // Edit user dialog
  const openEdit = (u: AppUser) => {
    setEditUser(u);
    setEditForm({ firstName: u.firstName ?? "", lastName: u.lastName ?? "", email: u.email, role: u.role });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    await updateUser(editUser.id, { ...editForm, name: `${editForm.firstName} ${editForm.lastName}`.trim() });
    toast.success("Gebruiker bijgewerkt.");
    setEditOpen(false);
  };

  // Inline role change
  const handleRoleChange = useCallback(async (userId: string, newRole: UserRole) => {
    if (userId === currentUser?.id) {
      toast.error("Je kan je eigen rol niet wijzigen.");
      return;
    }
    const targetUser = users.find(u => u.id === userId);
    await updateUser(userId, { role: newRole });
    writeAuditLog({
      action: "update",
      entity_type: "user_role",
      entity_id: userId,
      entity_name: targetUser?.name ?? userId,
      changes: { new_role: newRole, old_role: targetUser?.role },
    });
    toast.success("Rol bijgewerkt.");
  }, [currentUser, updateUser, users]);

  // Toggle active status
  const handleToggleActive = useCallback(async (userId: string, currentActive: boolean) => {
    if (userId === currentUser?.id) {
      toast.error("Je kan jezelf niet deactiveren.");
      return;
    }
    try {
      await db("profiles").update({ active: !currentActive }).eq("id", userId);
      toast.success(currentActive ? "Gebruiker gedeactiveerd." : "Gebruiker geactiveerd.");
      refreshUsers?.();
    } catch {
      toast.error("Fout bij wijzigen van status.");
    }
  }, [currentUser, refreshUsers]);

  const handleViewAs = useCallback((u: AppUser) => {
    simulateUser(u.name, u.role);
    navigate(u.role === "standenbouwer" ? "/standenbouwer" : "/");
  }, [simulateUser, navigate]);

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1>Gebruikers</h1>
        {isAdmin && (
          <Button size="sm" className="h-10 sm:h-8" onClick={() => { setInviteOpen(true); setInviteForm({ fullName: "", email: "", password: "", role: "editor" }); }}>
            <UserPlus className="h-4 w-4 mr-1" /> Gebruiker uitnodigen
          </Button>
        )}
      </div>

      <div className="mt-4">
          {/* Mobile card view */}
          <div className="block md:hidden space-y-2">
            {sorted.map((u) => {
              const isActive = (u as any).active !== false;
              return (
                <div key={u.id} className={`surface-card p-4 ${!isActive ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <UserAvatar name={u.name} avatarUrl={u.avatarUrl} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm flex items-center gap-1.5">{u.name} {!isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Inactief</Badge>}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      {isAdmin ? (
                        <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v as UserRole)}>
                          <SelectTrigger className="h-7 w-[130px] text-xs mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="standenbouwer">Standenbouwer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                      {isAdmin && (
                        <>
                          {u.id !== currentUser?.id && (
                            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleViewAs(u)} title={`Bekijk als ${u.name}`}>
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(u)}>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openResetDialog(u)}>
                                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Wachtwoord resetten</TooltipContent>
                          </Tooltip>
                          {u.id !== currentUser?.id && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openDeleteDialog(u)}>
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Verwijderen</TooltipContent>
                            </Tooltip>
                          )}
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => handleToggleActive(u.id, isActive)}
                            disabled={u.id === currentUser?.id}
                            className="scale-75"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table view */}
          <div className="surface-card overflow-hidden hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="lastName" currentSort={sort} onSort={toggleSort}>Naam</SortableTableHead>
                  <SortableTableHead sortKey="email" currentSort={sort} onSort={toggleSort}>E-mail</SortableTableHead>
                  <SortableTableHead sortKey="role" currentSort={sort} onSort={toggleSort}>Rol</SortableTableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((u) => {
                  const isActive = (u as any).active !== false;
                  return (
                    <TableRow key={u.id} className={!isActive ? "opacity-50" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={u.name} avatarUrl={u.avatarUrl} />
                          <span className="font-medium">{u.name}</span>
                          {!isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Inactief</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v as UserRole)} disabled={u.id === currentUser?.id}>
                            <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="standenbouwer">Standenbouwer</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="capitalize">{u.role}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => handleToggleActive(u.id, isActive)}
                            disabled={u.id === currentUser?.id}
                          />
                        ) : (
                          <span className={`text-xs ${isActive ? "text-success" : "text-muted-foreground"}`}>
                            {isActive ? "Actief" : "Inactief"}
                          </span>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {u.id !== currentUser?.id && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewAs(u)} title={`Bekijk als ${u.name}`}>
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openResetDialog(u)}>
                                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Wachtwoord resetten</TooltipContent>
                            </Tooltip>
                            {u.id !== currentUser?.id && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeleteDialog(u)}>
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Verwijderen</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="p-3 border-t border-border text-xs text-muted-foreground">
              {sorted.length} gebruiker{sorted.length !== 1 ? "s" : ""}
            </div>
          </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Gebruiker uitnodigen</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label>Volledige naam *</Label>
              <Input
                value={inviteForm.fullName}
                onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                placeholder="Jan Janssens"
                required
                className="h-10 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mailadres *</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="voornaam.achternaam@elia.be"
                required
                className="h-10 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label>Tijdelijk wachtwoord *</Label>
              <Input
                type="text"
                value={inviteForm.password}
                onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                placeholder="Minimaal 8 tekens"
                minLength={8}
                required
                className="h-10 sm:h-9"
              />
              <p className="text-xs text-muted-foreground">De gebruiker kan dit wachtwoord later wijzigen.</p>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v as UserRole })}>
                <SelectTrigger className="h-10 sm:h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="standenbouwer">Standenbouwer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="h-10 sm:h-9" onClick={() => setInviteOpen(false)}>Annuleren</Button>
              <Button type="submit" className="h-10 sm:h-9" disabled={inviteLoading}>
                {inviteLoading ? "Aanmaken..." : "Uitnodigen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Gebruiker bewerken</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Voornaam *</Label>
                <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} required className="h-10 sm:h-9" />
              </div>
              <div className="space-y-2">
                <Label>Achternaam</Label>
                <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="h-10 sm:h-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required className="h-10 sm:h-9" />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v as UserRole })}>
                <SelectTrigger className="h-10 sm:h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="standenbouwer">Standenbouwer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="h-10 sm:h-9" onClick={() => setEditOpen(false)}>Annuleren</Button>
              <Button type="submit" className="h-10 sm:h-9">Opslaan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={(open) => { setResetOpen(open); if (!open) setResetSuccess(false); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Wachtwoord resetten voor {resetUser?.name}</DialogTitle>
          </DialogHeader>
          {resetSuccess ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tijdelijk wachtwoord</Label>
                <div className="flex gap-2">
                  <Input value={resetPassword} readOnly className="h-10 sm:h-9 font-mono" />
                  <Button type="button" variant="outline" size="icon" className="h-10 sm:h-9 shrink-0" onClick={copyPassword}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive font-medium">Dit wachtwoord wordt niet meer getoond na het sluiten van dit venster.</p>
              </div>
              <DialogFooter>
                <Button onClick={() => setResetOpen(false)} className="h-10 sm:h-9">Sluiten</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label>E-mailadres</Label>
                <Input value={resetUser?.email ?? ""} readOnly className="h-10 sm:h-9 bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Nieuw wachtwoord *</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Minimaal 8 tekens"
                    minLength={8}
                    required
                    className="h-10 sm:h-9"
                  />
                  <Button type="button" variant="outline" size="sm" className="h-10 sm:h-9 shrink-0 gap-1.5" onClick={generatePassword}>
                    <RefreshCw className="h-3.5 w-3.5" /> Genereer
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" className="h-10 sm:h-9" onClick={() => setResetOpen(false)}>Annuleren</Button>
                <Button type="submit" className="h-10 sm:h-9" disabled={resetLoading || resetPassword.length < 8}>
                  {resetLoading ? "Resetten..." : "Wachtwoord resetten"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={(v) => { if (!v) { setDeleteOpen(false); setDeleteUser(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gebruiker verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je <span className="font-medium text-foreground">{deleteUser?.name}</span> wil verwijderen? Deze actie deactiveert de gebruiker permanent. Hun activiteit in audit logs blijft bewaard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Verwijderen..." : "Verwijderen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
