import React from 'react';
import { useNavigate } from 'react-router-dom';
import { pizzaService } from '../service/service';
import { User, UserList } from '../service/pizzaService';
import UserDialog from './userDialog';

interface Props {
  user: User | null;
  setUser: (user: User | null) => void;
}

export default function UserManagement({ user, setUser }: Props) {
  const navigate = useNavigate();
  const [list, setList] = React.useState<UserList>({ users: [], more: false });
  const [page, setPage] = React.useState(0);
  const [filter, setFilter] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [revision, setRevision] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [selected, setSelected] = React.useState<User | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteMessage, setDeleteMessage] = React.useState('');

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage('');
    pizzaService.getUsers(page, 10, `*${query}*`).then(result => {
      if (active) {
        if (!result.users.length && page > 0) setPage(page - 1);
        else setList(result);
      }
    }).catch((error: any) => {
      if (active) setMessage(error.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [page, query, revision]);

  function filterUsers(event: React.FormEvent) {
    event.preventDefault();
    setPage(0);
    setQuery(filter.trim());
    setRevision(value => value + 1);
  }

  async function deleteUser() {
    if (!selected) return;
    setDeleting(true);
    setDeleteMessage('');
    try {
      await pizzaService.deleteUser(selected);
      setSelected(null);
      if (String(selected.id) === String(user?.id)) {
        localStorage.removeItem('token');
        setUser(null);
        navigate('/');
      } else {
        setRevision(value => value + 1);
      }
    } catch (error: any) {
      setDeleteMessage(error.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="text-start py-8 px-4 sm:px-6 lg:px-8" aria-labelledby="users-heading">
      <h3 id="users-heading" className="text-neutral-100 text-xl">Users</h3>
      <form onSubmit={filterUsers} className="flex gap-2 my-4">
        <input aria-label="Filter users by name" placeholder="Filter users" value={filter} onChange={event => setFilter(event.target.value)} className="px-2 py-1 rounded-lg border border-gray-300" />
        <button type="submit" className="px-3 py-1 rounded-lg border border-orange-400 text-orange-400">Filter users</button>
      </form>
      {message && <div role="alert" className="text-yellow-200 my-3">{message} <button type="button" onClick={() => setRevision(value => value + 1)} className="underline">Retry users</button></div>}
      <div className="overflow-x-auto my-4 rounded-lg bg-neutral-100">
        <table aria-label="Users" aria-busy={loading} className="min-w-full divide-y divide-gray-200">
          <thead className="uppercase text-neutral-100 bg-slate-400">
            <tr>{['Name', 'Email', 'Role', 'Action'].map(heading => <th key={heading} scope="col" className="px-4 py-3 text-start text-sm font-medium">{heading}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? <tr><td colSpan={4} className="p-4">Loading users…</td></tr> : !message && list.users.length === 0 ? <tr><td colSpan={4} className="p-4">No users found</td></tr> : !message && list.users.map(entry => (
              <tr key={entry.id}>
                <td className="px-4 py-3">{entry.name}</td>
                <td className="px-4 py-3">{entry.email}</td>
                <td className="px-4 py-3">{entry.roles?.map(role => role.role === 'franchisee' ? `${role.role} on ${role.objectId}` : role.role).join(', ')}</td>
                <td className="px-4 py-3"><button type="button" className="px-3 py-1 rounded-lg border border-orange-600 text-orange-600" onClick={() => { setDeleteMessage(''); setSelected(entry); }}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end items-center gap-3 text-white">
        <button type="button" aria-label="Previous users" disabled={loading || page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded-lg bg-white text-gray-800 disabled:bg-neutral-400">«</button>
        <span aria-live="polite">Page {page + 1}</span>
        <button type="button" aria-label="Next users" disabled={loading || !!message || !list.more} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded-lg bg-white text-gray-800 disabled:bg-neutral-400">»</button>
      </div>
      {selected && <UserDialog title="Delete user" busy={deleting} onCancel={() => setSelected(null)}>
        <p className="p-4">Delete {selected.name} ({selected.email})? This permanently removes their account.</p>
        {deleteMessage && <p role="alert" className="px-4 pb-4 text-red-700">{deleteMessage}</p>}
        <div className="flex justify-end gap-3 p-4 border-t bg-slate-200">
          <button type="button" disabled={deleting} onClick={() => setSelected(null)} className="rounded-lg border px-3 py-2 bg-white">Cancel</button>
          <button type="button" disabled={deleting} onClick={deleteUser} className="rounded-lg px-3 py-2 bg-red-700 text-white">{deleting ? 'Deleting…' : 'Delete'}</button>
        </div>
      </UserDialog>}
    </section>
  );
}
