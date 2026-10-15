import React from 'react';
import { Link } from 'react-router-dom';
import View from './view';
import { pizzaService } from '../service/service';
import { Order, OrderHistory, Role, User } from '../service/pizzaService';
import Button from '../components/button';
import UserDialog from '../components/userDialog';

interface Props {
  user: User | null;
  setUser: (user: User) => void;
}

export default function DinerDashboard(props: Props) {
  const user = props.user || ({} as User);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState('');

  async function updateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get('password'));
    const updatedUser = { id: user.id, roles: user.roles, name: String(fields.get('name')).trim(), email: String(fields.get('email')).trim(), ...(password ? { password } : {}) };
    setSaving(true);
    setMessage('');
    try {
      props.setUser(await pizzaService.updateUser(updatedUser));
      setEditing(false);
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  React.useEffect(() => {
    (async () => {
      if (props.user) {
        const r: OrderHistory = await pizzaService.getOrders(user);
        setOrders(r.orders);
      }
    })();
  }, [user]);

  function formatRole(role: { role: Role; objectId?: string }) {
    if (role.role === Role.Franchisee) {
      return `Franchisee on ${role.objectId}`;
    }

    return role.role;
  }

  return (
    <View title="Your pizza kitchen">
      <div className="text-start py-8 px-4 sm:px-6 lg:px-8">
        <div className="hs-tooltip inline-block">
          <img className="hs-tooltip-toggle relative inline-block size-[96px] rounded-full ring-2 ring-white hover:z-10" src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=facearea&facepad=2&w=300&h=300&q=80" alt="Employee stock photo" />
        </div>

        <Button title="Edit" className="w-16 p-0" onPress={() => { setMessage(''); setEditing(true); }} />

        <div className="my-4 text-lg text-orange-200 text-start grid grid-cols-5 gap-2">
          <div className="font-semibold text-orange-400">name:</div> <div className="col-span-4">{user.name}</div>
          <div className="font-semibold text-orange-400">email:</div> <div className="col-span-4">{user.email}</div>
          <div className="font-semibold text-orange-400">role:</div>{' '}
          <div className="col-span-4">
            {user.roles &&
              user.roles.map((role, index) => (
                <span key={index}>
                  {index === 0 ? '' : ', '} {formatRole(role)}
                </span>
              ))}
          </div>
        </div>

        {orders?.length === 0 && (
          <div className="text-neutral-100">
            How have you lived this long without having a pizza?{' '}
            <Link className="text-orange-400 underline font-semibold" to="/menu">
              Buy one
            </Link>{' '}
            now!
          </div>
        )}
        {orders?.length > 0 && (
          <>
            <div className="text-neutral-100">Here is your history of all the good times.</div>
            <div className="bg-neutral-100 overflow-clip my-4">
              <div className="flex flex-col">
                <div className="-m-1.5 overflow-x-auto">
                  <div className="p-1.5 min-w-full inline-block align-middle">
                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="uppercase text-neutral-100 bg-slate-400 border-b-2 border-gray-500">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-start text-xs sm:text-sm font-medium">
                              ID
                            </th>
                            <th scope="col" className="px-6 py-3 text-start text-xs sm:text-sm font-medium">
                              Price
                            </th>
                            <th scope="col" className="px-6 py-3 text-start text-xs sm:text-sm font-medium">
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {orders.map((order, index) => (
                            <tr key={index} className="hover:bg-gray-100">
                              <td className="px-6 py-4 whitespace-nowrap text-start text-xs sm:text-sm font-medium text-gray-800">{order.id}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-start text-xs sm:text-sm text-gray-800">{order.items.reduce((a, c) => a + c.price, 0).toLocaleString()} ₿</td>
                              <td className="px-6 py-4 whitespace-nowrap text-start text-xs sm:text-sm text-gray-800">{order.date.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {editing && (
        <UserDialog title="Edit user" busy={saving} onCancel={() => setEditing(false)}>
          <form onSubmit={updateUser}>
            <fieldset disabled={saving} className="p-4 grid grid-cols-5 gap-3 items-center">
              <label htmlFor="edit-name" className="font-semibold">Name</label>
              <input id="edit-name" name="name" required pattern=".*\S.*" autoComplete="name" defaultValue={user.name} className="col-span-4 border rounded-md p-2" />
              <label htmlFor="edit-email" className="font-semibold">Email</label>
              <input id="edit-email" name="email" type="email" required autoComplete="email" defaultValue={user.email} className="col-span-4 border rounded-md p-2" />
              <label htmlFor="edit-password" className="font-semibold">Password</label>
              <input id="edit-password" name="password" type="password" autoComplete="new-password" className="col-span-4 border rounded-md p-2" />
              <p className="col-span-5 text-sm">Leave the password blank to keep your current password.</p>
            </fieldset>
            {message && <p role="alert" className="px-4 pb-4 text-red-700">{message}</p>}
            <div className="flex justify-end gap-3 p-4 border-t bg-slate-200">
              <button type="button" disabled={saving} onClick={() => setEditing(false)} className="rounded-lg border px-3 py-2 bg-white">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg px-3 py-2 bg-orange-600 text-white">{saving ? 'Updating…' : 'Update'}</button>
            </div>
          </form>
        </UserDialog>
      )}
    </View>
  );
}
