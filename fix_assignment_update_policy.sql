-- Permitir a los estudiantes actualizar sus propias asignaciones para marcarlas como completadas
CREATE POLICY "Students can update own assignments" ON public.assignments
    FOR UPDATE
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Verificar que user_progress tiene política de UPDATE
-- Si no la tiene, añadirla
CREATE POLICY "Users can update own progress" ON public.user_progress
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
