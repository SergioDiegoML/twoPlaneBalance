import { useForm } from "react-hook-form";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

const queryClient = new QueryClient();

const VECTOR_FIELDS = [
  { id: "VA", label: "Vibration A (VA)" },
  { id: "VB", label: "Vibration B (VB)" },
  { id: "WL", label: "Left Weight (WL)" },
  { id: "VpA", label: "After Left - A (VpA)" },
  { id: "VpB", label: "After Left - B (VpB)" },
  { id: "WR", label: "Right Weight (WR)" },
  { id: "VppA", label: "After Right - A (VppA)" },
  { id: "VppB", label: "After Right - B (VppB)" },
];

type FormData = {
  [key: string]: [number, number]; // [magnitude, angle_deg]
};

function VectorRow({ register, errors, id, label }: { register: any; errors: any; id: string; label: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-4">
        <label className="w-40 text-sm font-medium text-gray-700">{label}</label>
        <div className="flex flex-col">
          <Input
            type="number"
            step="any"
            placeholder="Magnitude"
            className="w-32"
            {...register(`${id}.0`, { required: true })}
          />
          {errors?.[id]?.[0] && <span className="text-red-500 text-xs mt-1">This field is required</span>}
        </div>
        <div className="flex flex-col">
          <Input
            type="number"
            step="any"
            placeholder="Angle (°)"
            className="w-32"
            {...register(`${id}.1`, { required: true })}
          />
          {errors?.[id]?.[1] && <span className="text-red-500 text-xs mt-1">This field is required</span>}
        </div>
      </div>
    </div>
  );
}

function BalancingForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("https://your-lambda-api-endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to calculate");
      return res.json();
    },
  });

  const onSubmit = (data: FormData) => {console.log(data);mutation.mutate(data);}

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl mx-auto p-6 bg-white shadow rounded-lg">
      <h2 className="text-xl font-semibold mb-6">Balancing Vector Calculator</h2>
      {VECTOR_FIELDS.map(({ id, label }) => (
        <VectorRow key={id} id={id} label={label} register={register} errors={errors} />
      ))}
      <Button type="submit" className="mt-4 w-full">{mutation.isPending ? <FontAwesomeIcon spin icon={faSpinner} /> : "Calculate"}</Button>

      {mutation.data && (
        <div className="mt-6 text-sm text-gray-800">
          <p><strong>Left Balance:</strong> Magnitude: {mutation.data.B_L.magnitude.toFixed(2)} | Angle: {mutation.data.B_L.angle_deg.toFixed(2)}°</p>
          <p><strong>Right Balance:</strong> Magnitude: {mutation.data.B_R.magnitude.toFixed(2)} | Angle: {mutation.data.B_R.angle_deg.toFixed(2)}°</p>
        </div>
      )}

      {mutation.error && <p className="mt-4 text-red-500 text-sm">Error: {mutation.error.message}</p>}
    </form>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <BalancingForm />
      </div>
    </QueryClientProvider>
  );
}
